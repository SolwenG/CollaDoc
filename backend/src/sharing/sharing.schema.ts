import * as z from "zod";

const idSchema = z.coerce.number().int().positive();

export const documentParamsSchema = z.object({
  id: idSchema,
});

export const shareLinkParamsSchema = z.object({
  id: idSchema,
  linkId: idSchema,
});

export const memberParamsSchema = z.object({
  id: idSchema,
  userId: idSchema,
});

// VIEWER by default: without an explicit choice, grant the least rights
export const createShareLinkSchema = z.strictObject({
  role: z.enum(["EDITOR", "VIEWER"]).default("VIEWER"),
});

// A token is 43 characters long: the cap avoids hashing a huge string
export const acceptShareLinkSchema = z.strictObject({
  token: z.string().min(1).max(100),
});

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
