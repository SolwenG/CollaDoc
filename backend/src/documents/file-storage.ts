import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import type { AllowedFileType } from "../../../shared/files.ts";
import { isAllowedFileType } from "../../../shared/files.ts";

// Flat directory: the folder tree only exists in the database
const uploadDir = path.resolve(process.env["UPLOAD_DIR"] ?? "uploads");

export function resolveStoragePath(storagePath: string): string {
  return path.join(uploadDir, storagePath);
}

/** Reads the magic bytes: the extension and the type sent by the browser are not trusted */
export async function detectFileType(
  buffer: Uint8Array,
): Promise<AllowedFileType | null> {
  const detected = await fileTypeFromBuffer(buffer);
  return detected && isAllowedFileType(detected.mime) ? detected.mime : null;
}

/** Returns the generated name the file is stored under */
export async function saveFile(buffer: Uint8Array): Promise<string> {
  await mkdir(uploadDir, { recursive: true });
  const storagePath = randomUUID();
  await writeFile(resolveStoragePath(storagePath), buffer, { flag: "wx" });
  return storagePath;
}

/** Never throws: a file left behind is an orphan, not a broken document */
export async function removeFile(storagePath: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storagePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      console.error(`Could not remove stored file ${storagePath}`, error);
  }
}
