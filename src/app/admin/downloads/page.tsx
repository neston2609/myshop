import Image from "next/image";
import {
  deleteDownloadCategoryAction,
  deleteDownloadHideRuleAction,
  deleteDownloadSourceAction,
  saveDownloadCategoryAction,
  saveDownloadHideRuleAction,
  saveDownloadSourceAction,
} from "@/app/actions";
import { ImageUploadField } from "@/components/image-upload-field";
import { formatBytes } from "@/lib/download-sources";
import { prisma } from "@/lib/prisma";

export default async function AdminDownloadsPage() {
  const [sources, categories, hideRules, logs] = await Promise.all([
    prisma.downloadSource.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.downloadCategory.findMany({ include: { source: true }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] }),
    prisma.downloadHideRule.findMany({ orderBy: [{ position: "asc" }, { createdAt: "desc" }] }),
    prisma.downloadLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Download sources</h2>
          <div className="mt-4 divide-y divide-black/10">
            {sources.map((source) => (
              <details key={source.id} className="py-3 text-sm">
                <summary className="grid cursor-pointer list-none gap-3 rounded-md p-2 hover:bg-slate-50 md:grid-cols-[1fr_90px_110px_120px]">
                  <span className="font-medium">{source.name}<span className="ml-2 text-slate-400">{source.host}</span></span>
                  <span>{source.protocol.toUpperCase()}</span>
                  <span>{source.enabled ? "Enabled" : "Disabled"}</span>
                  <span className="text-xs text-slate-500">Click to edit</span>
                </summary>
                <div className="mt-3 grid gap-3 rounded-md bg-slate-50 p-3">
                  <SourceForm
                    id={source.id}
                    name={source.name}
                    protocol={source.protocol}
                    host={source.host || ""}
                    port={source.port?.toString() || ""}
                    username={source.username || ""}
                    basePath={source.basePath}
                    enabled={source.enabled}
                  />
                  <form action={deleteDownloadSourceAction}>
                    <input type="hidden" name="id" value={source.id} />
                    <button className="h-10 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700">
                      Delete source
                    </button>
                  </form>
                </div>
              </details>
            ))}
            {sources.length === 0 ? <p className="py-4 text-sm text-slate-500">No sources yet.</p> : null}
          </div>
        </div>
        <SourceForm />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Download path mappings</h2>
          <div className="mt-4 divide-y divide-black/10">
            {categories.map((category) => (
              <details key={category.id} className="py-3 text-sm">
                <summary className="grid cursor-pointer list-none items-center gap-3 rounded-md p-2 hover:bg-slate-50 md:grid-cols-[60px_1fr_160px_90px_120px]">
                  <span>{category.imageUrl ? <Image src={category.imageUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-md object-cover" /> : null}</span>
                  <span className="font-medium">{category.name}<span className="ml-2 text-slate-400">/{category.slug}</span></span>
                  <span>{category.source?.name || "Unmapped"}</span>
                  <span>{category.enabled ? "Enabled" : "Disabled"}</span>
                  <span className="text-xs text-slate-500">Click to edit</span>
                </summary>
                <div className="mt-3 grid gap-3 rounded-md bg-slate-50 p-3">
                  <CategoryForm
                    sources={sources}
                    id={category.id}
                    name={category.name}
                    slug={category.slug}
                    description={category.description || ""}
                    imageUrl={category.imageUrl || ""}
                    sourceId={category.sourceId || ""}
                    remotePath={category.remotePath}
                    coverPath={category.coverPath || ""}
                    position={category.position.toString()}
                    enabled={category.enabled}
                  />
                  <form action={deleteDownloadCategoryAction}>
                    <input type="hidden" name="id" value={category.id} />
                    <button className="h-10 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700">
                      Delete mapping
                    </button>
                  </form>
                </div>
              </details>
            ))}
            {categories.length === 0 ? <p className="py-4 text-sm text-slate-500">No download mappings yet.</p> : null}
          </div>
        </div>
        <CategoryForm sources={sources} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Hide rules</h2>
          <div className="mt-4 divide-y divide-black/10">
            {hideRules.map((rule) => (
              <div key={rule.id} className="grid gap-3 py-3 text-sm md:grid-cols-[1fr_90px_auto] md:items-center">
                <span className="font-mono">{rule.pattern}</span>
                <span>{rule.enabled ? "Enabled" : "Disabled"}</span>
                <form action={deleteDownloadHideRuleAction}>
                  <input type="hidden" name="id" value={rule.id} />
                  <button className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700">Delete</button>
                </form>
              </div>
            ))}
            {hideRules.length === 0 ? <p className="py-4 text-sm text-slate-500">No hide rules.</p> : null}
          </div>
        </div>
        <form action={saveDownloadHideRuleAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Add hide rule</h2>
          <input name="pattern" placeholder="*.tmp or Thumbs.db" required className="h-10 rounded-md border border-black/10 px-3" />
          <input name="position" type="number" defaultValue="0" className="h-10 rounded-md border border-black/10 px-3" />
          <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> Enabled</label>
          <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save rule</button>
        </form>
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Recent downloads</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">File</th><th>Path</th><th>Size</th><th>User</th><th>When</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-black/10">
                  <td className="py-2 font-medium">{log.fileName}</td>
                  <td className="text-slate-500">{log.path}</td>
                  <td>{formatBytes(log.sizeBytes)}</td>
                  <td className="text-slate-500">{log.user?.email || "-"}</td>
                  <td className="text-slate-500">{log.createdAt.toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 ? <tr><td colSpan={5} className="py-4 text-slate-500">No downloads yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SourceForm({
  id,
  name = "",
  protocol = "sftp",
  host = "",
  port = "",
  username = "",
  basePath = "/",
  enabled = true,
}: {
  id?: string;
  name?: string;
  protocol?: string;
  host?: string;
  port?: string;
  username?: string;
  basePath?: string;
  enabled?: boolean;
}) {
  return (
    <form action={saveDownloadSourceAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">{id ? "Edit source" : "Add SFTP/FTPS source"}</h2>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input name="name" defaultValue={name} placeholder="Source name" required className="h-10 rounded-md border border-black/10 px-3" />
      <select name="protocol" defaultValue={protocol} className="h-10 rounded-md border border-black/10 px-3">
        <option value="sftp">SFTP</option>
        <option value="ftps">FTPS</option>
        <option value="ftp">FTP</option>
      </select>
      <input name="host" defaultValue={host} placeholder="Host" required className="h-10 rounded-md border border-black/10 px-3" />
      <input name="port" defaultValue={port} type="number" placeholder="Port" className="h-10 rounded-md border border-black/10 px-3" />
      <input name="username" defaultValue={username} placeholder="Username" required className="h-10 rounded-md border border-black/10 px-3" />
      <input name="password" type="password" placeholder={id ? "Password (leave blank to keep current)" : "Password"} required={!id} className="h-10 rounded-md border border-black/10 px-3" />
      <input name="basePath" defaultValue={basePath} placeholder="/base/path" required className="h-10 rounded-md border border-black/10 px-3" />
      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={enabled} /> Enabled</label>
      <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save source</button>
    </form>
  );
}

function CategoryForm({
  sources,
  id,
  name = "",
  slug = "",
  description = "",
  imageUrl = "",
  sourceId = "",
  remotePath = "",
  coverPath = "",
  position = "0",
  enabled = true,
}: {
  sources: Array<{ id: string; name: string; protocol: string; enabled: boolean }>;
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  sourceId?: string;
  remotePath?: string;
  coverPath?: string;
  position?: string;
  enabled?: boolean;
}) {
  return (
    <form action={saveDownloadCategoryAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">{id ? "Edit mapping" : "Add download mapping"}</h2>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input name="name" defaultValue={name} placeholder="Category name" required className="h-10 rounded-md border border-black/10 px-3" />
      <input name="slug" defaultValue={slug} placeholder="slug" className="h-10 rounded-md border border-black/10 px-3" />
      <textarea name="description" defaultValue={description} placeholder="Description" rows={3} className="rounded-md border border-black/10 px-3 py-2" />
      <ImageUploadField name="imageUrl" label="Category image" defaultValue={imageUrl} previewClassName="h-24 w-36" />
      <select name="sourceId" defaultValue={sourceId} required className="h-10 rounded-md border border-black/10 px-3">
        <option value="" disabled>Choose source</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>{source.name} ({source.protocol.toUpperCase()}){source.enabled ? "" : " disabled"}</option>
        ))}
      </select>
      <input name="remotePath" defaultValue={remotePath} placeholder="/remote/path/category" required className="h-10 rounded-md border border-black/10 px-3" />
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        <span>Cover path</span>
        <input name="coverPath" defaultValue={coverPath} placeholder="/remote/path/cover/images (optional)" className="h-10 rounded-md border border-black/10 px-3 font-normal text-slate-900" />
        <span className="text-xs font-normal text-slate-500">Used to match folder names like Folder Name [xxx01] with cover files named xxx01.jpg/png/webp/gif.</span>
      </label>
      <input name="position" defaultValue={position} type="number" className="h-10 rounded-md border border-black/10 px-3" />
      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={enabled} /> Enabled</label>
      <button disabled={sources.length === 0} className="h-10 rounded-md bg-[#17201c] font-semibold text-white disabled:opacity-40">Save mapping</button>
    </form>
  );
}
