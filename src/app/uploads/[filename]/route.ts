import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

type UploadRouteProps = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, { params }: UploadRouteProps) {
  const { filename } = await params;
  const safeFilename = path.basename(filename);

  if (safeFilename !== filename) return NextResponse.json({ error: "Invalid filename" }, { status: 400 });

  const extension = path.extname(safeFilename).toLowerCase();
  const contentType = contentTypes[extension];

  if (!contentType) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(/* turbopackIgnore: true */ uploadDir, safeFilename);

  try {
    const body = await readFile(/* turbopackIgnore: true */ filePath);
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "public, max-age=604800",
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
