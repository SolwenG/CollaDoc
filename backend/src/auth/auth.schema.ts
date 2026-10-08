import * as z from "zod";
import { normalizedUsernameSchema } from "../users/users.schema.ts";

export const loginSchema = z
	.strictObject({
		username: normalizedUsernameSchema.min(1, { error: "Username is required" }),
		password: z.string().min(1, { error: "Password is required" }),
	})
	.brand<"LoginInput">();

export type LoginInput = z.infer<typeof loginSchema>;
