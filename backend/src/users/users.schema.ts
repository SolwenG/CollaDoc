import * as z from "zod";
import { displayNameSchema } from "./profiles/profile.schemas.ts";

export const normalizedUsernameSchema = z.string().trim().toLowerCase();

export const registerSchema = z
	.strictObject({
		username: normalizedUsernameSchema
			.min(3, { error: "Username must be at least 3 characters long" })
			.max(32, { error: "Username must be at most 32 characters long" })
			.regex(/^[a-z0-9_.-]+$/, {
				error:
					'Username may only contain lowercase letters, digits, "_", "." and "-"',
			}),
		displayName: displayNameSchema,
		password: z.string().min(1, { error: "Password is required" }),
	})
	.brand<"RegisterInput">();

export type RegisterInput = z.infer<typeof registerSchema>;
