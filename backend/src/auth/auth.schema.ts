import * as z from "zod";
import { normalizedUsernameSchema } from "../users/users.schema.ts";

export const loginSchema = z
  .strictObject({
    username: normalizedUsernameSchema.min(1, {
      error: "Username is required",
    }),
    password: z.string().min(1, { error: "Password is required" }),
  })
  .brand<"LoginInput">();

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaSetupSchema = z
  .strictObject({
    password: z.string().min(1, { error: "Password is required" }),
  })
  .brand<"MfaSetupInput">();

export type MfaSetupInput = z.infer<typeof mfaSetupSchema>;

export const mfaCodeSchema = z
  .strictObject({
    code: z.string().regex(/^\d{6}$/, { error: "Code must be 6 digits" }),
  })
  .brand<"MfaCodeInput">();

export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;
