import * as documentsRepository from '../documents/documents.repository.ts'
import { toDocumentView } from '../documents/documents.service.ts'
import * as fileStorage from '../documents/file-storage.ts'
import { isUniqueViolation } from '../prisma/db-errors.ts'
import type { FolderPathEntry } from './folders.repository.ts'
import * as foldersRepository from './folders.repository.ts'
import type { UpdateFolderInput } from './folders.schema.ts'

export function wouldCreateCycle(folderId: number, targetPath: FolderPathEntry[]): boolean {
    return targetPath.some((entry) => entry.id === folderId)
}

export async function getFolderContents(ownerId: number, folderId: number | null) {
    let folder: foldersRepository.FolderRow | null = null
    let ancestors: FolderPathEntry[] = []

    if (folderId !== null) {
        folder = await foldersRepository.findOwnedFolder(folderId, ownerId)
        if (!folder) return null
        ancestors = (await foldersRepository.findFolderPath(folderId, ownerId)).slice(0, -1)
    }

    const [folders, documents] = await Promise.all([
        foldersRepository.findChildFolders(ownerId, folderId),
        documentsRepository.findFolderDocuments(ownerId, folderId),
    ])

    return {
        folder,
        ancestors,
        folders,
        documents: documents.map(toDocumentView),
    }
}

export async function createFolder(ownerId: number, name: string, parentId: number | null) {
    if (parentId !== null && !(await foldersRepository.findOwnedFolder(parentId, ownerId)))
        return { status: 'parentNotFound' } as const

    try {
        const folder = await foldersRepository.createFolder(ownerId, name, parentId)
        return { status: 'created', folder } as const
    } catch (error) {
        if (isUniqueViolation(error)) return { status: 'nameTaken' } as const
        throw error
    }
}

export async function updateFolder(ownerId: number, folderId: number, changes: UpdateFolderInput) {
    if (!(await foldersRepository.findOwnedFolder(folderId, ownerId)))
        return { status: 'notFound' } as const

    if (changes.parentId !== undefined && changes.parentId !== null) {
        const targetPath = await foldersRepository.findFolderPath(changes.parentId, ownerId)
        if (targetPath.length === 0) return { status: 'parentNotFound' } as const
        if (wouldCreateCycle(folderId, targetPath)) return { status: 'cycle' } as const
    }

    try {
        const folder = await foldersRepository.updateFolder(folderId, changes)
        return folder ? ({ status: 'updated', folder } as const) : ({ status: 'notFound' } as const)
    } catch (error) {
        if (isUniqueViolation(error)) return { status: 'nameTaken' } as const
        throw error
    }
}

export async function deleteFolder(ownerId: number, folderId: number) {
    if (!(await foldersRepository.findOwnedFolder(folderId, ownerId))) return null

    const documents = await foldersRepository.findSubtreeDocuments(folderId)
    await foldersRepository.deleteFolder(folderId)

    await Promise.all(
        documents.map((document) =>
            document.storagePath ? fileStorage.removeFile(document.storagePath) : undefined
        )
    )

    return documents.filter((document) => document.kind === 'TEXT').map((document) => document.id)
}
