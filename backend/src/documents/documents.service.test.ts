import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/db.ts', () => ({ db: {} }))
vi.mock('./documents.repository.ts', () => ({
    replaceFile: vi.fn(),
    findOwner: vi.fn(),
    findMembers: vi.fn(),
}))
vi.mock('./file-storage.ts', () => ({
    detectFileType: vi.fn(),
    saveFile: vi.fn(),
    removeFile: vi.fn(),
}))

const documentsRepository = await import('./documents.repository.ts')
const fileStorage = await import('./file-storage.ts')
const { listParticipants, replaceFile, resolveAccess } = await import('./documents.service.ts')

describe('resolveAccess', () => {
    it('gives the owner full access', () => {
        expect(resolveAccess(1, 1, null)).toBe('OWNER')
    })

    it('gives a member their invitation role', () => {
        expect(resolveAccess(1, 2, 'VIEWER')).toBe('VIEWER')
    })

    it('denies a user who is neither owner nor member', () => {
        expect(resolveAccess(1, 2, null)).toBeNull()
    })
})

describe('replaceFile', () => {
    const document = {
        id: 7,
        name: 'rapport',
        kind: 'FILE',
        ownerId: 1,
        originalName: 'rapport.pdf',
        mimeType: 'application/pdf',
        storagePath: 'old-file',
    } as const
    const upload = {
        buffer: new Uint8Array([1]),
        originalName: 'photo.png',
        size: 1,
    }

    beforeEach(() => {
        vi.resetAllMocks()
        vi.mocked(fileStorage.detectFileType).mockResolvedValue('image/png')
        vi.mocked(fileStorage.saveFile).mockResolvedValue('new-file')
    })

    it('removes the old file only once the database points to the new one', async () => {
        const order: string[] = []
        vi.mocked(documentsRepository.replaceFile).mockImplementation(async () => {
            order.push('database')
        })
        vi.mocked(fileStorage.removeFile).mockImplementation(async (path) => {
            order.push(`remove ${path}`)
        })

        await replaceFile(document, 1, 'photo.png', upload)

        expect(order).toEqual(['database', 'remove old-file'])
    })

    it('keeps the old file and drops the new one when the database fails', async () => {
        vi.mocked(documentsRepository.replaceFile).mockRejectedValue(new Error('db down'))

        await expect(replaceFile(document, 1, 'photo.png', upload)).rejects.toThrow('db down')

        expect(fileStorage.removeFile).toHaveBeenCalledExactlyOnceWith('new-file')
    })

    it('writes nothing when the real type is not allowed', async () => {
        vi.mocked(fileStorage.detectFileType).mockResolvedValue(null)

        const result = await replaceFile(document, 1, 'photo.png', upload)

        expect(result.status).toBe('unsupportedType')
        expect(fileStorage.saveFile).not.toHaveBeenCalled()
    })
})

describe('listParticipants', () => {
    const document = {
        id: 7,
        name: 'notes',
        kind: 'TEXT',
        ownerId: 1,
        originalName: null,
        mimeType: null,
        storagePath: null,
    } as const

    it('puts the owner first, then the members with their role', async () => {
        vi.mocked(documentsRepository.findOwner).mockResolvedValue({
            id: 1,
            username: 'alice',
            displayName: 'Alice',
        })
        vi.mocked(documentsRepository.findMembers).mockResolvedValue([
            { role: 'EDITOR', user: { id: 2, username: 'bob', displayName: 'Bob' } },
        ] as never)

        expect(await listParticipants(document)).toEqual([
            { id: 1, username: 'alice', displayName: 'Alice', role: 'OWNER' },
            { id: 2, username: 'bob', displayName: 'Bob', role: 'EDITOR' },
        ])
    })
})
