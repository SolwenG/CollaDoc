import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error.ts'
import { getAuthUser } from '../middlewares/auth.middleware.ts'
import { notifyDocumentDeleted } from '../realtime/realtime-notifier.ts'
import {
    createTextDocumentSchema,
    documentParamsSchema,
    downloadQuerySchema,
    itemNameSchema,
    updateDocumentSchema,
    uploadFileSchema,
} from './documents.schema.ts'
import * as documentsService from './documents.service.ts'
import { resolveStoragePath } from './file-storage.ts'

function documentNotFound() {
    return new AppError('DOCUMENT_NOT_FOUND', 'Document introuvable')
}

function folderNotFound() {
    return new AppError('FOLDER_NOT_FOUND', 'Dossier introuvable')
}

function unsupportedFileType() {
    return new AppError(
        'UNSUPPORTED_FILE_TYPE',
        'Type de fichier non autorisé (PDF, JPEG, PNG ou WebP uniquement)'
    )
}

function getUploadedFile(req: Request) {
    if (!req.file) throw new AppError('FILE_REQUIRED', 'Aucun fichier envoyé')
    return {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        size: req.file.size,
    }
}

/** 404 rather than 403 for a stranger, so ids cannot be probed */
async function findReadableDocument(req: Request) {
    const { id: userId } = getAuthUser(req)
    const { id } = documentParamsSchema.parse(req.params)

    const found = await documentsService.findAccessibleDocument(id, userId)
    if (!found) throw documentNotFound()
    return found
}

async function findOwnedDocument(req: Request) {
    const { document, access } = await findReadableDocument(req)
    if (access !== 'OWNER') {
        throw new AppError('FORBIDDEN', 'Seul le propriétaire peut modifier ce document')
    }
    return document
}

async function sendDocumentView(res: Response, status: number, id: number) {
    const document = await documentsService.getDocumentView(id)
    if (!document) throw documentNotFound()
    return res.status(status).json({ document })
}

export async function getDocument(req: Request, res: Response) {
    const { document, access } = await findReadableDocument(req)

    const details = await documentsService.getDocumentDetails(document, access)
    if (!details) throw documentNotFound()

    return res.json({ ...details, access })
}

export async function getParticipants(req: Request, res: Response) {
    const { document } = await findReadableDocument(req)

    const participants = await documentsService.listParticipants(document)

    return res.json({ participants })
}

export async function createTextDocument(req: Request, res: Response) {
    const { id: userId } = getAuthUser(req)
    const { name, folderId } = createTextDocumentSchema.parse(req.body)

    const result = await documentsService.createTextDocument(userId, name, folderId)
    if (result.status === 'folderNotFound') throw folderNotFound()

    return sendDocumentView(res, 201, result.documentId)
}

export async function uploadFile(req: Request, res: Response) {
    const { id: userId } = getAuthUser(req)
    const file = getUploadedFile(req)
    const body = uploadFileSchema.parse(req.body ?? {})
    const name = body.name ?? itemNameSchema.parse(file.originalName)

    const result = await documentsService.uploadFile(userId, name, body.folderId ?? null, file)
    switch (result.status) {
        case 'unsupportedType':
            throw unsupportedFileType()
        case 'folderNotFound':
            throw folderNotFound()
    }

    return sendDocumentView(res, 201, result.documentId)
}

export async function replaceFile(req: Request, res: Response) {
    const { id: userId } = getAuthUser(req)
    const document = await findOwnedDocument(req)
    if (document.kind !== 'FILE') {
        throw new AppError('NOT_A_FILE', "Ce document n'est pas un fichier")
    }
    const file = getUploadedFile(req)
    const name = itemNameSchema.parse(file.originalName)

    const result = await documentsService.replaceFile(document, userId, name, file)
    if (result.status === 'unsupportedType') throw unsupportedFileType()

    return sendDocumentView(res, 200, document.id)
}

function contentDisposition(type: 'inline' | 'attachment', filename: string) {
    const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, '_')
    return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export async function downloadFile(req: Request, res: Response) {
    const { document } = await findReadableDocument(req)
    const { download } = downloadQuerySchema.parse(req.query)
    if (document.kind !== 'FILE' || !document.storagePath || !document.mimeType) {
        throw new AppError('NOT_A_FILE', "Ce document n'est pas un fichier")
    }

    const filename = document.originalName ?? document.name
    res.sendFile(resolveStoragePath(document.storagePath), {
        headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': contentDisposition(download ? 'attachment' : 'inline', filename),
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'private, no-cache',
        },
    })
}

export async function updateDocument(req: Request, res: Response) {
    const document = await findOwnedDocument(req)
    const changes = updateDocumentSchema.parse(req.body)

    const result = await documentsService.updateDocument(document, changes)
    if (result.status === 'folderNotFound') throw folderNotFound()

    return sendDocumentView(res, 200, document.id)
}

export async function deleteDocument(req: Request, res: Response) {
    const document = await findOwnedDocument(req)

    await documentsService.deleteDocument(document)
    if (document.kind === 'TEXT') await notifyDocumentDeleted(document.id)

    return res.status(204).end()
}
