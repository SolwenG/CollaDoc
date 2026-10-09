import * as z from "zod";

const idSchema = z.coerce.number().int().positive();

const memberRoleSchema = z.enum(["EDITOR", "VIEWER"]);

export const documentParamsSchema = z.object({
  id: idSchema,
});

export const memberParamsSchema = z.object({
  id: idSchema,
  userId: idSchema,
});

// VIEWER by default: without an explicit choice, grant the least rights
export const createShareLinkSchema = z.strictObject({
  role: memberRoleSchema.default("VIEWER"),
});

// No default here: changing a role without saying which one is a mistake
export const updateMemberRoleSchema = z.strictObject({
  role: memberRoleSchema,
});

// A token is about 150 characters long: the cap avoids signing a huge string
export const acceptShareLinkSchema = z.strictObject({
  token: z.string().min(1).max(300),
});

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
