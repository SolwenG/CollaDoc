import type { DocumentRole } from '../../../shared/ot/index.ts'
import * as foldersRepository from '../folders/folders.repository.ts'
import type { DocumentForAccess, DocumentRow } from './documents.repository.ts'
import * as documentsRepository from './documents.repository.ts'
import type { UpdateDocumentInput } from './documents.schema.ts'
import * as fileStorage from './file-storage.ts'

export function resolveAccess(
    ownerId: number,
    userId: number,
    memberRole: 'EDITOR' | 'VIEWER' | null
): DocumentRole | null {
    if (ownerId === userId) return 'OWNER'
    return memberRole
}

export function toDocumentView({ ownerId, ...row }: DocumentRow) {
    return row
}

export type DocumentView = ReturnType<typeof toDocumentView>

export async function getDocumentView(documentId: number) {
    const row = await documentsRepository.findDocumentView(documentId)
    return row ? toDocumentView(row) : null
}

export async function getDocumentDetails(document: DocumentForAccess, access: DocumentRole) {
    const view = await getDocumentView(document.id)
    if (!view) return null
    if (access !== 'OWNER') return { document: { ...view, folderId: null }, path: [] }

    const path =
        view.folderId === null
            ? []
            : await foldersRepository.findFolderPath(view.folderId, document.ownerId)
    return { document: view, path }
}

export async function findAccessibleDocument(
    documentId: number,
    userId: number
): Promise<{ document: DocumentForAccess; access: DocumentRole } | null> {
    const document = await documentsRepository.findDocumentForAccess(documentId)
    if (!document) return null

    const memberRole =
        document.ownerId === userId
            ? null
            : await documentsRepository.findMemberRole(documentId, userId)
    const access = resolveAccess(document.ownerId, userId, memberRole)
    return access ? { document, access } : null
}

async function ownsFolder(ownerId: number, folderId: number | null) {
    if (folderId === null) return true
    return (await foldersRepository.findOwnedFolder(folderId, ownerId)) !== null
}

export async function createTextDocument(ownerId: number, name: string, folderId: number | null) {
    if (!(await ownsFolder(ownerId, folderId))) return { status: 'folderNotFound' } as const

    const id = await documentsRepository.createTextDocument(ownerId, name, folderId)
    return { status: 'created', documentId: id } as const
}

type UploadedFile = { buffer: Uint8Array; originalName: string; size: number }

export async function uploadFile(
    ownerId: number,
    name: string,
    folderId: number | null,
    file: UploadedFile
) {
    const mimeType = await fileStorage.detectFileType(file.buffer)
    if (!mimeType) return { status: 'unsupportedType' } as const
    if (!(await ownsFolder(ownerId, folderId))) return { status: 'folderNotFound' } as const

    const storagePath = await fileStorage.saveFile(file.buffer)
    try {
        const id = await documentsRepository.createFileDocument(ownerId, name, folderId, {
            originalName: file.originalName,
            storagePath,
            mimeType,
            size: file.size,
        })
        return { status: 'created', documentId: id } as const
    } catch (error) {
        await fileStorage.removeFile(storagePath)
        throw error
    }
}

/** The document takes the name of the new file */
export async function replaceFile(
    document: DocumentForAccess,
    userId: number,
    name: string,
    file: UploadedFile
) {
    const mimeType = await fileStorage.detectFileType(file.buffer)
    if (!mimeType) return { status: 'unsupportedType' } as const

    const storagePath = await fileStorage.saveFile(file.buffer)
    try {
        await documentsRepository.replaceFile(
            document.id,
            name,
            {
                originalName: file.originalName,
                storagePath,
                mimeType,
                size: file.size,
            },
            userId
        )
    } catch (error) {
        await fileStorage.removeFile(storagePath)
        throw error
    }

    if (document.storagePath) await fileStorage.removeFile(document.storagePath)
    return { status: 'replaced' } as const
}

export async function updateDocument(document: DocumentForAccess, changes: UpdateDocumentInput) {
    if (changes.folderId !== undefined && !(await ownsFolder(document.ownerId, changes.folderId)))
        return { status: 'folderNotFound' } as const

    await documentsRepository.updateDocument(document.id, changes)
    return { status: 'updated' } as const
}

/** The row goes first: at worst a file is left orphaned on the disk */
export async function deleteDocument(document: DocumentForAccess) {
    await documentsRepository.deleteDocument(document.id)
    if (document.storagePath) await fileStorage.removeFile(document.storagePath)
}
