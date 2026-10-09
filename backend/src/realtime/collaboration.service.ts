import type { DocumentRole, Operation } from 'shared/ot/index'
import { db } from '../prisma/db.ts'

// Operations older than this many revisions before the snapshot are purged
export const KEPT_REVISIONS = 500

export type JournalEntry = {
    revision: number
    opId: string
    operation: Operation
    authorId: number
}

export async function findDocumentRole(
    documentId: number,
    userId: number
): Promise<DocumentRole | null> {
    const document = await db.orm.public.Document.select('id', 'kind', 'ownerId')
        .where({ id: documentId })
        .first()
    if (!document || document.kind !== 'TEXT') return null
    if (document.ownerId === userId) return 'OWNER'

    const member = await db.orm.public.DocumentMember.select('role')
        .where({ documentId, userId })
        .first()
    return member?.role ?? null
}

export async function findSnapshot(documentId: number) {
    return db.orm.public.Document.select('content', 'contentRevision')
        .where({ id: documentId })
        .first()
}

export async function findOperationsAfter(
    documentId: number,
    revision: number
): Promise<JournalEntry[]> {
    const rows = await db.orm.public.DocumentOperation.select(
        'revision',
        'opId',
        'operation',
        'authorId'
    )
        .where((o) => o.documentId.eq(documentId))
        .where((o) => o.revision.gt(revision))
        .orderBy((o) => o.revision.asc())
        .all()
    return rows.map((row) => ({ ...row, operation: row.operation as Operation }))
}

export async function findOperationByOpId(opId: string) {
    return db.orm.public.DocumentOperation.select('documentId', 'revision').where({ opId }).first()
}

export async function insertOperation(documentId: number, entry: JournalEntry): Promise<void> {
    await db.orm.public.DocumentOperation.create({
        documentId,
        revision: entry.revision,
        opId: entry.opId,
        operation: entry.operation,
        authorId: entry.authorId,
    })
}

type Snapshot = {
    documentId: number
    content: string
    contentRevision: number
    lastModifiedById: number | null
}

export async function saveSnapshot({
    documentId,
    content,
    contentRevision,
    lastModifiedById,
}: Snapshot): Promise<void> {
    await db.transaction(async (tx) => {
        await tx.orm.public.Document.where({ id: documentId }).updateAll({
            content,
            contentRevision,
            ...(lastModifiedById !== null && { lastModifiedById }),
        })
        await tx.orm.public.DocumentOperation.where((o) => o.documentId.eq(documentId))
            .where((o) => o.revision.lt(contentRevision - KEPT_REVISIONS))
            .deleteAll()
    })
}
