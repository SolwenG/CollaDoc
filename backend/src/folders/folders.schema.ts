import { z } from 'zod'
import { idSchema, itemNameSchema } from '../documents/documents.schema.ts'

export const folderParamsSchema = z.object({ id: idSchema })

export const createFolderSchema = z.strictObject({
    name: itemNameSchema,
    parentId: idSchema.nullable().default(null),
})

export const updateFolderSchema = z
    .strictObject({
        name: itemNameSchema.optional(),
        parentId: idSchema.nullable().optional(),
    })
    .refine((body) => body.name !== undefined || body.parentId !== undefined, {
        message: 'Rien à modifier',
    })

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>
