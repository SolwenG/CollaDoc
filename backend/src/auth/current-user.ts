import type { Response } from "express";
import { AppError } from "../errors/app-error.ts";

export type CurrentUser = {
  id: number;
  role: "USER" | "ADMIN";
};

// TODO(auth): the auth middleware is expected to set res.locals.user = { id, role }.
// Adapt this single reader if the final contract differs (see docs/admin-api.md).
export function getCurrentUser(res: Response): CurrentUser {
  const user = res.locals.user as CurrentUser | undefined;
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Authentification requise");
  }
  return user;
}
