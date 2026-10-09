import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/db.ts', () => ({ db: {} }))

const { wouldCreateCycle } = await import('./folders.service.ts')

const path = [
    { id: 1, name: 'Projets' },
    { id: 2, name: '2026' },
    { id: 3, name: 'Octobre' },
]

describe('wouldCreateCycle', () => {
    it('rejects moving a folder into itself', () => {
        expect(wouldCreateCycle(3, path)).toBe(true)
    })

    it('rejects moving a folder into one of its descendants', () => {
        expect(wouldCreateCycle(1, path)).toBe(true)
    })

    it('accepts moving a folder into an unrelated folder', () => {
        expect(wouldCreateCycle(4, path)).toBe(false)
    })
})
