import * as z from 'zod'

export const MAX_INSERTED_LENGTH = 100_000
export const MAX_DOCUMENT_LENGTH = 1_000_000

const stepSchema = z.union([
    z.strictObject({ retain: z.int().positive() }),
    z.strictObject({
        insert: z
            .string()
            .min(1)
            .refine((text) => text.isWellFormed()),
    }),
    z.strictObject({ delete: z.int().positive() }),
])

const operationSchema = z
    .array(stepSchema)
    .max(10_000)
    .refine(
        (steps) =>
            steps.reduce(
                (total, step) =>
                    total + ('insert' in step ? step.insert.length : 0),
                0
            ) <= MAX_INSERTED_LENGTH
    )

const documentIdSchema = z.int().positive()

export const joinSchema = z.strictObject({
    documentId: documentIdSchema,
    revision: z.int().nonnegative().optional(),
})

export const leaveSchema = z.strictObject({
    documentId: documentIdSchema,
})

export const operationMessageSchema = z.strictObject({
    documentId: documentIdSchema,
    revision: z.int().nonnegative(),
    opId: z.uuid(),
    operation: operationSchema,
})
