import { z } from "zod";

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 50;

// Letters (any alphabet, accents included), digits, spaces and - ' ’ . _
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{Nd} '’._-]+$/u;

export const displayNameSchema = z
  .string()
  .trim()
  // NFC merges a decomposed "e" + accent into a single "é" letter.
  .normalize("NFC")
  .min(
    DISPLAY_NAME_MIN_LENGTH,
    `Le nom affiché doit contenir au moins ${DISPLAY_NAME_MIN_LENGTH} caractères`,
  )
  .max(
    DISPLAY_NAME_MAX_LENGTH,
    `Le nom affiché ne doit pas contenir plus de ${DISPLAY_NAME_MAX_LENGTH} caractères`,
  )
  .refine((value) => DISPLAY_NAME_PATTERN.test(value), {
    message:
      "Le nom affiché ne peut contenir que des lettres, des chiffres, des espaces et les caractères - ' . _",
  });

export const profileParamsSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
});

export const updateProfileSchema = z.strictObject({
  displayName: displayNameSchema,
});

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(1, "Le nouveau mot de passe est requis"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
