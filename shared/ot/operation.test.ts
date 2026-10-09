import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
    OperationBuilder,
    apply,
    compose,
    diff,
    targetLength,
    transform,
    transformIndex,
} from './operation.ts'
import type { Operation } from './operation.ts'

const text = fc.string({ maxLength: 30 })

// A random valid operation on the given text
function operationOn(base: string): fc.Arbitrary<Operation> {
    const step = fc.record({
        kind: fc.constantFrom('retain', 'insert', 'delete'),
        size: fc.integer({ min: 1, max: 6 }),
        insert: fc.string({ minLength: 1, maxLength: 4 }),
    })
    return fc.array(step, { maxLength: 8 }).map((steps) => {
        const builder = new OperationBuilder()
        let remaining = base.length
        for (const { kind, size, insert } of steps) {
            if (kind === 'insert') {
                builder.insert(insert)
            } else {
                const count = Math.min(size, remaining)
                if (kind === 'retain') builder.retain(count)
                else builder.delete(count)
                remaining -= count
            }
        }
        return builder.retain(remaining).build()
    })
}

const concurrentOperations = text.chain((base) =>
    fc.tuple(fc.constant(base), operationOn(base), operationOn(base))
)

describe('apply', () => {
    it('applies the examples of the documentation', () => {
        expect(apply('Bonjour', [{ retain: 7 }, { insert: '!' }])).toBe('Bonjour!')
        expect(apply('Bonjour', [{ delete: 1 }, { retain: 6 }])).toBe('onjour')
        expect(apply('Bonjour', [{ delete: 1 }, { retain: 6 }, { insert: '!' }])).toBe('onjour!')
    })

    it('refuses an operation made for a text of another length', () => {
        expect(() => apply('Bonjour', [{ retain: 3 }])).toThrow()
    })

    it("produces a text of the operation's target length", () => {
        fc.assert(
            fc.property(
                text.chain((base) => fc.tuple(fc.constant(base), operationOn(base))),
                ([base, operation]) => {
                    expect(apply(base, operation).length).toBe(targetLength(operation))
                }
            )
        )
    })
})

describe('transform', () => {
    it("keeps the other user's insert when a delete covers it", () => {
        const alice: Operation = [{ retain: 5 }, { insert: 'X' }, { retain: 5 }]
        const bob: Operation = [{ retain: 2 }, { delete: 6 }, { retain: 2 }]
        const [bobAfterAlice] = transform(bob, alice)
        expect(apply(apply('ABCDEFGHIJ', alice), bobAfterAlice)).toBe('ABXIJ')
    })

    it('shifts an insert placed after a concurrent delete', () => {
        const alice: Operation = [{ retain: 7 }, { insert: '!' }]
        const bob: Operation = [{ delete: 1 }, { retain: 6 }]
        const [aliceAfterBob] = transform(alice, bob)
        expect(aliceAfterBob).toEqual([{ retain: 6 }, { insert: '!' }])
    })

    it("puts the server's text first when both insert at the same position", () => {
        const client: Operation = [{ retain: 3 }, { insert: 'c' }]
        const server: Operation = [{ retain: 3 }, { insert: 's' }]
        const [clientPrime, serverPrime] = transform(client, server)
        expect(apply(apply('abc', server), clientPrime)).toBe('abcsc')
        expect(apply(apply('abc', client), serverPrime)).toBe('abcsc')
    })

    it('converges whatever the order the operations are applied in', () => {
        fc.assert(
            fc.property(concurrentOperations, ([base, client, server]) => {
                const [clientPrime, serverPrime] = transform(client, server)
                expect(apply(apply(base, server), clientPrime)).toBe(
                    apply(apply(base, client), serverPrime)
                )
            }),
            { numRuns: 2000 }
        )
    })
})

describe('compose', () => {
    it('gives the same text as applying both operations one after the other', () => {
        const sequence = text.chain((base) =>
            operationOn(base).chain((first) =>
                fc.tuple(fc.constant(base), fc.constant(first), operationOn(apply(base, first)))
            )
        )
        fc.assert(
            fc.property(sequence, ([base, first, second]) => {
                expect(apply(base, compose(first, second))).toBe(apply(apply(base, first), second))
            }),
            { numRuns: 2000 }
        )
    })
})

describe('transformIndex', () => {
    it('moves a caret with the text around it', () => {
        // "Bonjour" -> "onjour!", caret between "Bonj" and "our"
        const operation: Operation = [{ delete: 1 }, { retain: 6 }, { insert: '!' }]
        expect(transformIndex(operation, 4)).toBe(3)
        expect(transformIndex(operation, 0)).toBe(0)
    })

    it('pushes the caret right when text is inserted exactly at it', () => {
        expect(transformIndex([{ retain: 2 }, { insert: 'ab' }, { retain: 3 }], 2)).toBe(4)
    })

    it('keeps a caret placed at the end at the end', () => {
        fc.assert(
            fc.property(
                text.chain((base) => fc.tuple(fc.constant(base), operationOn(base))),
                ([base, operation]) => {
                    expect(transformIndex(operation, base.length)).toBe(targetLength(operation))
                }
            )
        )
    })
})

describe('diff', () => {
    it('turns the old text into the new one', () => {
        fc.assert(
            fc.property(text, text, (before, after) => {
                expect(apply(before, diff(before, after))).toBe(after)
            })
        )
    })

    it('only touches what changed', () => {
        expect(diff('Bonjour', 'Bonsoir')).toEqual([
            { retain: 3 },
            { insert: 'soi' },
            { delete: 3 },
            { retain: 1 },
        ])
    })

    it('never splits an emoji', () => {
        // Both emoji share the same high surrogate
        const operation = diff('a😀b', 'a😁b')
        for (const step of operation) {
            if ('insert' in step) expect(step.insert.isWellFormed()).toBe(true)
        }
        expect(operation).toEqual([{ retain: 1 }, { insert: '😁' }, { delete: 2 }, { retain: 1 }])
    })
})
