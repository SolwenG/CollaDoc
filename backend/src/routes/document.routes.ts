import { Router } from 'express'
import * as z from 'zod'
import { AppError } from '../errors/app-error.ts'
import { db } from '../prisma/db.ts'

const router = Router()

const idSchema = z.coerce.number().int().positive()

router.get('/:id/members', async (req, res) => {
    const documentId = idSchema.parse(req.params.id)

    const doc = await db.orm.public.Document.select('ownerId')
        .where({ id: documentId })
        .first()

    if (!doc) {
        throw new AppError('NOT_FOUND', 'Document not found')
    }

    // Get owner
    const owner = await db.orm.public.User.select(
        'id',
        'username',
        'displayName'
    )
        .where({ id: doc.ownerId })
        .first()

    // Get members
    const members = await db.orm.public.DocumentMember.select('userId')
        .where({ documentId })
        .include('user', (user) => user.select('id', 'username', 'displayName'))

    const result = [
        ...(owner ? [{ ...owner, isOwner: true }] : []),
        ...members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.displayName,
            isOwner: false,
        })),
    ]

    res.json(result)
})

export { router as DocumentRoutes }
