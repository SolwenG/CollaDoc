import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import type { AllowedFileType } from 'shared/files'
import { isAllowedFileType } from 'shared/files'

const uploadDir = path.resolve(process.env['UPLOAD_DIR'] ?? 'uploads')

export function resolveStoragePath(storagePath: string): string {
    return path.join(uploadDir, storagePath)
}

export async function detectFileType(buffer: Uint8Array): Promise<AllowedFileType | null> {
    const detected = await fileTypeFromBuffer(buffer)
    return detected && isAllowedFileType(detected.mime) ? detected.mime : null
}

export async function saveFile(buffer: Uint8Array): Promise<string> {
    await mkdir(uploadDir, { recursive: true })
    const storagePath = randomUUID()
    await writeFile(resolveStoragePath(storagePath), buffer, { flag: 'wx' })
    return storagePath
}

export async function removeFile(storagePath: string): Promise<void> {
    try {
        await unlink(resolveStoragePath(storagePath))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
            console.error(`Could not remove stored file ${storagePath}`, error)
    }
}
