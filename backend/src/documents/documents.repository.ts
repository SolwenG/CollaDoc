import { db } from '../prisma/db.ts'

const DOCUMENT_FIELDS = [
    'id',
    'name',
    'kind',
    'ownerId',
    'folderId',
    'originalName',
    'mimeType',
    'size',
    'createdAt',
    'updatedAt',
] as const

function selectDocumentView<T extends typeof db.orm.public.Document>(documents: T) {
    return documents
        .select(...DOCUMENT_FIELDS)
        .include('lastModifiedBy', (user) => user.select('id', 'displayName'))
}

export type DocumentRow = Awaited<ReturnType<ReturnType<typeof selectDocumentView>['all']>>[number]

export function findDocumentView(documentId: number) {
    return selectDocumentView(db.orm.public.Document.where({ id: documentId })).first()
}

/** Both kinds, in the folder given or at the root of the owner when null */
export function findFolderDocuments(ownerId: number, folderId: number | null) {
    return selectDocumentView(db.orm.public.Document.where({ ownerId, folderId }))
        .orderBy([(d) => d.name.asc(), (d) => d.id.asc()])
        .all()
}

/** What an access check and a file download need, storagePath included */
export function findDocumentForAccess(documentId: number) {
    return db.orm.public.Document.select(
        'id',
        'name',
        'kind',
        'ownerId',
        'originalName',
        'mimeType',
        'storagePath'
    )
        .where({ id: documentId })
        .first()
}

export type DocumentForAccess = NonNullable<Awaited<ReturnType<typeof findDocumentForAccess>>>

export async function findMemberRole(documentId: number, userId: number) {
    const member = await db.orm.public.DocumentMember.select('role')
        .where({ documentId, userId })
        .first()
    return member?.role ?? null
}

export async function createTextDocument(ownerId: number, name: string, folderId: number | null) {
    const { id } = await db.orm.public.Document.select('id').create({
        name,
        kind: 'TEXT',
        ownerId,
        folderId,
        content: '',
        lastModifiedById: ownerId,
    })
    return id
}

type StoredFile = {
    originalName: string
    storagePath: string
    mimeType: string
    size: number
}

export async function createFileDocument(
    ownerId: number,
    name: string,
    folderId: number | null,
    file: StoredFile
) {
    const { id } = await db.orm.public.Document.select('id').create({
        name,
        kind: 'FILE',
        ownerId,
        folderId,
        ...file,
        lastModifiedById: ownerId,
    })
    return id
}

export async function replaceFile(
    documentId: number,
    name: string,
    file: StoredFile,
    lastModifiedById: number
) {
    await db.orm.public.Document.where({ id: documentId }).updateAll({
        name,
        ...file,
        lastModifiedById,
    })
}

export async function updateDocument(
    documentId: number,
    changes: { name?: string; folderId?: number | null }
) {
    await db.orm.public.Document.where({ id: documentId }).updateAll(changes)
}

export async function deleteDocument(documentId: number) {
    await db.orm.public.Document.where({ id: documentId }).deleteAll()
}
