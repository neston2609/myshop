import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "File too large" }, { status: 413 });

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${nanoid(12)}.${extension}`;
  const target = path.join(/* turbopackIgnore: true */ uploadDir, filename);
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${filename}` });
}
