import type { Request, Response } from 'express'
import { getAuthUser } from '../middlewares/auth.middleware.ts'
import { notifyAccessRevoked, notifyRoleChanged } from '../realtime/realtime-notifier.ts'
import {
    acceptShareLinkSchema,
    createShareLinkSchema,
    documentParamsSchema,
    memberParamsSchema,
    shareLinkParamsSchema,
    updateMemberRoleSchema,
} from './sharing.schema.ts'
import * as sharingService from './sharing.service.ts'

export async function getShareLinks(req: Request, res: Response) {
    const currentUser = getAuthUser(req)
    const { id } = documentParamsSchema.parse(req.params)

    await sharingService.assertDocumentOwner(id, currentUser.id)
    const shareLinks = await sharingService.listActiveShareLinks(id)

    return res.json({ shareLinks })
}

export async function createShareLink(req: Request, res: Response) {
    const currentUser = getAuthUser(req)
    const { id } = documentParamsSchema.parse(req.params)
    const { role } = createShareLinkSchema.parse(req.body)

    await sharingService.assertDocumentOwner(id, currentUser.id)
    const shareLink = await sharingService.createShareLink(id, role, currentUser.id)

    return res.status(201).json({ shareLink })
}

export async function revokeShareLink(req: Request, res: Response) {
    const currentUser = getAuthUser(req)
    const { id, linkId } = shareLinkParamsSchema.parse(req.params)

    await sharingService.assertDocumentOwner(id, currentUser.id)
    await sharingService.revokeShareLink(id, linkId)

    return res.status(204).end()
}

export async function acceptShareLink(req: Request, res: Response) {
    const currentUser = getAuthUser(req)
    const { token } = acceptShareLinkSchema.parse(req.body)

    const result = await sharingService.acceptShareLink(token, currentUser.id)
    // Unlocks the editor if the document is already open in another tab
    if (result.outcome === 'upgraded') {
        await notifyRoleChanged(result.documentId, currentUser.id)
    }

    return res.json(result)
}

export async function getMembers(req: Request, res: Response) {
    const currentUser = getAuthUser(req)
    const { id } = documentParamsSchema.parse(req.params)

    await sharingService.assertDocumentOwner(id, currentUser.id)
    const members = await sharingService.listMembers(id)

    return res.json({ members })
}

export async function updateMemberRole(req: Request, res: Response) {
    const currentUser = getAuthUser(req)
    const { id, userId } = memberParamsSchema.parse(req.params)
    const { role } = updateMemberRoleSchema.parse(req.body)

    await sharingService.assertDocumentOwner(id, currentUser.id)
    await sharingService.updateMemberRole(id, currentUser.id, userId, role)
    // Locks or unlocks the editor of the member if they have the document open
    await notifyRoleChanged(id, userId)

    return res.status(204).end()
}

export async function removeMember(req: Request, res: Response) {
    const currentUser = getAuthUser(req)
    const { id, userId } = memberParamsSchema.parse(req.params)

    await sharingService.assertDocumentOwner(id, currentUser.id)
    await sharingService.removeMember(id, currentUser.id, userId)
    // Closes the document for the removed member if they have it open
    await notifyAccessRevoked(id, userId)

    return res.status(204).end()
}
