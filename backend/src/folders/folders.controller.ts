import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error.ts'
import { getAuthUser } from '../middlewares/auth.middleware.ts'
import { notifyDocumentDeleted } from '../realtime/realtime-notifier.ts'
import { createFolderSchema, folderParamsSchema, updateFolderSchema } from './folders.schema.ts'
import * as foldersService from './folders.service.ts'

function folderNotFound() {
    return new AppError('FOLDER_NOT_FOUND', 'Dossier introuvable')
}

function folderNameTaken() {
    return new AppError('FOLDER_NAME_TAKEN', 'Un dossier porte déjà ce nom à cet emplacement')
}

export async function getRootContents(req: Request, res: Response) {
    const { id } = getAuthUser(req)
    return res.json(await foldersService.getFolderContents(id, null))
}

export async function getFolderContents(req: Request, res: Response) {
    const { id: userId } = getAuthUser(req)
    const { id } = folderParamsSchema.parse(req.params)

    const contents = await foldersService.getFolderContents(userId, id)
    if (!contents) throw folderNotFound()

    return res.json(contents)
}

export async function createFolder(req: Request, res: Response) {
    const { id: userId } = getAuthUser(req)
    const { name, parentId } = createFolderSchema.parse(req.body)

    const result = await foldersService.createFolder(userId, name, parentId)
    switch (result.status) {
        case 'parentNotFound':
            throw folderNotFound()
        case 'nameTaken':
            throw folderNameTaken()
    }

    return res.status(201).json({ folder: result.folder })
}

export async function updateFolder(req: Request, res: Response) {
    const { id: userId } = getAuthUser(req)
    const { id } = folderParamsSchema.parse(req.params)
    const changes = updateFolderSchema.parse(req.body)

    const result = await foldersService.updateFolder(userId, id, changes)
    switch (result.status) {
        case 'notFound':
        case 'parentNotFound':
            throw folderNotFound()
        case 'cycle':
            throw new AppError(
                'FOLDER_MOVE_CYCLE',
                'Un dossier ne peut pas être déplacé dans lui-même ou dans un de ses sous-dossiers'
            )
        case 'nameTaken':
            throw folderNameTaken()
    }

    return res.json({ folder: result.folder })
}

export async function deleteFolder(req: Request, res: Response) {
    const { id: userId } = getAuthUser(req)
    const { id } = folderParamsSchema.parse(req.params)

    const deletedTextDocumentIds = await foldersService.deleteFolder(userId, id)
    if (!deletedTextDocumentIds) throw folderNotFound()

    await Promise.all(deletedTextDocumentIds.map(notifyDocumentDeleted))

    return res.status(204).end()
}
