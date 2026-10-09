export const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
] as const

export type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number]

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export function isAllowedFileType(mime: string): mime is AllowedFileType {
    return (ALLOWED_FILE_TYPES as readonly string[]).includes(mime)
}
