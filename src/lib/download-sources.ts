import path from "path";
import { PassThrough, type Writable } from "stream";
import { Client, FileType } from "basic-ftp";
import type { DownloadCategory, DownloadSource } from "@prisma/client";
import SftpClient from "ssh2-sftp-client";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export type DownloadEntry = {
  name: string;
  type: "dir" | "file";
  size?: number | null;
  modifiedAt?: Date | number | null;
  path: string;
  thumb?: string;
  thumbSource?: "folder" | "cover";
};

export type WiiGameSelectorEntry = {
  name: string;
  code: string;
  path: string;
  sizeBytes: number | null;
  coverFile?: string;
  coverSource?: "cover";
};

type Ops = {
  list(remotePath: string): Promise<Array<Omit<DownloadEntry, "path">>>;
  stat(remotePath: string): Promise<{ size?: number | null; isDirectory: boolean }>;
  streamTo(remotePath: string, writable: Writable): Promise<unknown>;
};

type CategoryWithSource = DownloadCategory & { source: DownloadSource | null };

function sourcePassword(source: DownloadSource) {
  return source.passwordCiphertext ? decryptSecret(source.passwordCiphertext) : undefined;
}

async function withSftp<T>(source: DownloadSource, fn: (ops: Ops) => Promise<T>) {
  const sftp = new SftpClient();
  await sftp.connect({
    host: source.host,
    port: source.port || 22,
    username: source.username,
    password: sourcePassword(source),
    readyTimeout: 30000,
  });

  try {
    return await fn({
      async list(remotePath) {
        const entries = await sftp.list(remotePath);
        return entries.map((entry) => ({
          name: entry.name,
          type: entry.type === "d" ? "dir" as const : "file" as const,
          size: entry.size,
          modifiedAt: entry.modifyTime || null,
        }));
      },
      async stat(remotePath) {
        const stat = await sftp.stat(remotePath);
        return { size: stat.size, isDirectory: stat.isDirectory };
      },
      async streamTo(remotePath, writable) {
        return sftp.get(remotePath, writable);
      },
    });
  } finally {
    await sftp.end().catch(() => undefined);
  }
}

async function cdAbs(client: Client, target: string) {
  await client.cd("/");
  const segments = String(target || "").split("/").filter(Boolean);
  for (const segment of segments) {
    await client.cd(segment);
  }
}

async function withFtp<T>(source: DownloadSource, secure: boolean, fn: (ops: Ops) => Promise<T>) {
  const client = new Client(30000, { allowSeparateTransferHost: true });
  client.ftp.verbose = false;
  await client.access({
    host: source.host || "",
    port: source.port || 21,
    user: source.username || "",
    password: sourcePassword(source),
    secure,
    secureOptions: secure ? { rejectUnauthorized: false } : undefined,
  });

  try {
    return await fn({
      async list(remotePath) {
        await cdAbs(client, remotePath);
        const entries = await client.list();
        return entries.map((entry) => ({
          name: entry.name,
          type: entry.type === FileType.Directory ? "dir" as const : "file" as const,
          size: entry.size,
          modifiedAt: entry.modifiedAt || null,
        }));
      },
      async stat(remotePath) {
        try {
          const size = await client.size(remotePath);
          return { size, isDirectory: false };
        } catch {
          await client.cd(remotePath);
          return { size: 0, isDirectory: true };
        }
      },
      async streamTo(remotePath, writable) {
        return client.downloadTo(writable, remotePath);
      },
    });
  } finally {
    client.close();
  }
}

async function withClient<T>(source: DownloadSource, fn: (ops: Ops) => Promise<T>) {
  if (!source.enabled) throw new Error("This download source is disabled.");
  if (source.protocol === "sftp") return withSftp(source, fn);
  if (source.protocol === "ftp") return withFtp(source, false, fn);
  if (source.protocol === "ftps") return withFtp(source, true, fn);
  throw new Error(`Unsupported download protocol: ${source.protocol}`);
}

function normalizeRemotePath(value: string) {
  return String(value || "").replace(/\\/g, "/");
}

export function safeResolve(rootPath: string, subPath: string) {
  const root = normalizeRemotePath(rootPath || "/").replace(/\/+$/, "") || "/";
  const cleaned = path.posix.normalize(`/${normalizeRemotePath(String(subPath || ""))}`).replace(/^\/+/, "");
  if (cleaned.split("/").some((segment) => segment === "..")) throw new Error("Invalid path.");
  const full = path.posix.join(root, cleaned);
  if (!(root === "/" || full === root || full.startsWith(`${root}/`))) throw new Error("Invalid path.");
  return full;
}

function patternToRegex(pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
}

async function hideRegexes() {
  const rules = await prisma.downloadHideRule.findMany({ where: { enabled: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return rules.map((rule) => patternToRegex(rule.pattern));
}

function isHidden(name: string, rules: RegExp[]) {
  return name.startsWith(".") || rules.some((rule) => rule.test(name));
}

function imageExtension(name: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(name);
}

function folderCoverKey(name: string) {
  const matches = [...name.matchAll(/\[([^\[\]]+)\]/g)];
  return matches.at(-1)?.[1]?.trim().toLowerCase() || "";
}

export function downloadFolderCode(name: string) {
  return folderCoverKey(name).toUpperCase();
}

async function coverMap(ops: Ops, coverPath?: string | null) {
  if (!coverPath) return new Map<string, string>();
  try {
    const coverRoot = safeResolve(coverPath, "");
    const entries = await ops.list(coverRoot);
    const covers = new Map<string, string>();
    for (const entry of entries) {
      if (entry.type !== "file" || !imageExtension(entry.name)) continue;
      const key = path.posix.basename(entry.name, path.posix.extname(entry.name)).trim().toLowerCase();
      if (!key || covers.has(key)) continue;
      covers.set(key, entry.name);
    }
    return covers;
  } catch {
    return new Map<string, string>();
  }
}

async function folderTotalSize(ops: Ops, rules: RegExp[], remotePath: string, depth = 0): Promise<number> {
  if (depth > 6) return 0;
  const entries = await ops.list(remotePath);
  let total = 0;
  for (const entry of entries.filter((item) => !isHidden(item.name, rules))) {
    const nextPath = path.posix.join(remotePath, entry.name);
    if (entry.type === "file") {
      total += Number(entry.size || 0);
      continue;
    }
    total += await folderTotalSize(ops, rules, nextPath, depth + 1).catch(() => 0);
  }
  return total;
}

export async function listWiiGameSelectorEntries(category: CategoryWithSource) {
  if (!category.source) throw new Error("This download category is not mapped to a source.");
  const rules = await hideRegexes();
  return withClient(category.source, async (ops) => {
    const dir = safeResolve(category.remotePath, "");
    const entries = await ops.list(dir);
    const covers = await coverMap(ops, category.coverPath);
    const folders = entries.filter((entry) => entry.type === "dir" && !isHidden(entry.name, rules));
    const out: WiiGameSelectorEntry[] = [];

    for (const folder of folders) {
      const code = downloadFolderCode(folder.name);
      const remotePath = path.posix.join(dir, folder.name);
      const sizeBytes = await folderTotalSize(ops, rules, remotePath).catch(() => 0);
      const coverFile = code ? covers.get(code.toLowerCase()) : undefined;
      out.push({
        name: folder.name,
        code,
        path: folder.name,
        sizeBytes,
        coverFile,
        coverSource: coverFile ? "cover" : undefined,
      });
    }

    return out.sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function listWiiGameSelectorFolders(category: CategoryWithSource) {
  if (!category.source) throw new Error("This download category is not mapped to a source.");
  const rules = await hideRegexes();
  return withClient(category.source, async (ops) => {
    const dir = safeResolve(category.remotePath, "");
    const entries = await ops.list(dir);
    const covers = await coverMap(ops, category.coverPath);
    const folders = entries.filter((entry) => entry.type === "dir" && !isHidden(entry.name, rules));

    return folders
      .map((folder) => {
        const code = downloadFolderCode(folder.name);
        const coverFile = code ? covers.get(code.toLowerCase()) : undefined;
        return {
          name: folder.name,
          code,
          path: folder.name,
          sizeBytes: null,
          coverFile,
          coverSource: coverFile ? "cover" as const : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function listDownloadEntries(category: CategoryWithSource, subPath: string) {
  if (!category.source) throw new Error("This download category is not mapped to a source.");
  const rules = await hideRegexes();
  return withClient(category.source, async (ops) => {
    const dir = safeResolve(category.remotePath, subPath);
    const entries = await ops.list(dir);
    const covers = await coverMap(ops, category.coverPath);
    const cleanSub = String(subPath || "").replace(/^\/+|\/+$/g, "");
    const out: DownloadEntry[] = [];

    for (const entry of entries.filter((item) => !isHidden(item.name, rules))) {
      const shaped: DownloadEntry = {
        ...entry,
        path: cleanSub ? `${cleanSub}/${entry.name}` : entry.name,
      };
      if (entry.type === "dir") {
        const key = folderCoverKey(entry.name);
        const coverFile = key ? covers.get(key) : "";
        if (coverFile) {
          shaped.thumb = coverFile;
          shaped.thumbSource = "cover";
          out.push(shaped);
          continue;
        }
        try {
          const thumb = path.posix.join(dir, entry.name, "folder.jpg");
          const stat = await ops.stat(thumb);
          if (!stat.isDirectory) {
            shaped.thumb = `${shaped.path}/folder.jpg`;
            shaped.thumbSource = "folder";
          }
        } catch {
          // Folders without folder.jpg simply use the default icon.
        }
      }
      out.push(shaped);
    }

    return out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  });
}

export async function findDownloadFolderCover(category: CategoryWithSource, subPath: string) {
  if (!category.source || !category.coverPath || !subPath) return null;
  return withClient(category.source, async (ops) => {
    const folderName = path.posix.basename(normalizeRemotePath(subPath).replace(/\/+$/g, ""));
    const key = folderCoverKey(folderName);
    if (!key) return null;
    const covers = await coverMap(ops, category.coverPath);
    const coverFile = covers.get(key);
    return coverFile ? { file: coverFile, source: "cover" as const } : null;
  });
}

export async function openDownloadStream(category: CategoryWithSource, subPath: string) {
  if (!category.source) throw new Error("This download category is not mapped to a source.");
  const rules = await hideRegexes();
  const full = safeResolve(category.remotePath, subPath);
  const segments = String(subPath || "").split("/").filter(Boolean);
  if (segments.some((segment) => isHidden(segment, rules))) throw new Error("File not found.");

  const stream = new PassThrough();
  const filename = path.posix.basename(full);
  const started = withClient(category.source, async (ops) => {
    const stat = await ops.stat(full);
    if (stat.isDirectory) throw new Error("Not a file.");
    await ops.streamTo(full, stream);
    stream.end();
    return { filename, size: stat.size ?? null };
  }).catch((error) => {
    stream.destroy(error);
    throw error;
  });

  return { filename, stream, started };
}

export async function openInlineImageStream(category: CategoryWithSource, subPath: string, options?: { source?: "folder" | "cover" }) {
  if (!/\.(jpe?g|png|webp|gif)$/i.test(subPath || "")) throw new Error("Not an image.");
  if (!category.source) throw new Error("This download category is not mapped to a source.");
  const root = options?.source === "cover" ? category.coverPath : category.remotePath;
  if (!root) throw new Error("This download category is not mapped to an image path.");
  const full = safeResolve(root, subPath);
  const stream = new PassThrough();
  const started = withClient(category.source, async (ops) => {
    await ops.streamTo(full, stream);
    stream.end();
  }).catch((error) => {
    stream.destroy(error);
    throw error;
  });
  return { stream, started };
}

export function imageContentType(filename: string) {
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.gif$/i.test(filename)) return "image/gif";
  return "image/jpeg";
}

export function formatBytes(size?: number | null) {
  if (size == null) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(size);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}
