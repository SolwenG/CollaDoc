import * as z from "zod";
import { usernameSchema } from "../users/users.schema.ts";

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

export const createUserSchema = z.strictObject({
	username: usernameSchema,
	role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export const listUsersQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGE_SIZE_MAX)
		.default(PAGE_SIZE_DEFAULT),
	search: z.string().trim().max(100).optional(),
});

export const userIdParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
