import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

/**
 * Original uploads are kept on disk so a lecturer or student can re-download
 * the source file. Only the extracted text is used by the AI layer.
 */
export async function saveUpload(
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${safeName}`;

  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return storedName;
}

export function uploadPath(storedName: string) {
  return path.join(UPLOAD_DIR, path.basename(storedName));
}
