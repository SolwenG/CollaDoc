import { z } from "zod";

export const NAME_MAX_LENGTH = 255;

export const itemNameSchema = z
	.string()
	.trim()
	.normalize("NFC")
	.min(1, "Le nom est requis")
	.max(
		NAME_MAX_LENGTH,
		`Le nom ne doit pas contenir plus de ${NAME_MAX_LENGTH} caractères`,
	);

export const idSchema = z.coerce.number().int().positive();

export const documentParamsSchema = z.object({ id: idSchema });

export const createTextDocumentSchema = z.strictObject({
	name: itemNameSchema,
	folderId: idSchema.nullable().default(null),
});

export const uploadFileSchema = z.strictObject({
	name: itemNameSchema.optional(),
	folderId: idSchema.optional(),
});

export const updateDocumentSchema = z
	.strictObject({
		name: itemNameSchema.optional(),
		folderId: idSchema.nullable().optional(),
	})
	.refine((body) => body.name !== undefined || body.folderId !== undefined, {
		message: "Rien à modifier",
	});

export const downloadQuerySchema = z.object({
	download: z.literal("1").optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
