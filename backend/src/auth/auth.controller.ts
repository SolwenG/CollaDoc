import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.ts";
import { getAuthUser } from "../middlewares/auth.middleware.ts";
import { findPublicUserById } from "../users/users.service.ts";
import { loginSchema } from "./auth.schema.ts";
import { login } from "./auth.service.ts";
import {
  clearSessionCookie,
  deleteSessionByToken,
  readSessionToken,
  setSessionCookie,
} from "./session.ts";

export async function loginUser(req: Request, res: Response) {
  const credentials = loginSchema.parse(req.body);
  const { user, token, expiresAt, mfaRequired } = await login(credentials);

  setSessionCookie(res, token, expiresAt);

  if (mfaRequired) {
    return res.status(200).json({ mfaRequired: true });
  }

  return res.status(200).json({ user });
}

export async function getCurrentUser(req: Request, res: Response) {
  const { id } = getAuthUser(req);
  const user = await findPublicUserById(id);

  // requireAuth just checked the user, so only a deletion in between gets here
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Authentication required");
  }

  return res.status(200).json({ user });
}

/** Idempotent: also succeeds without a cookie or with a dead session, the goal is to be logged out */
export async function logoutUser(req: Request, res: Response) {
  const token = readSessionToken(req);
  if (token) await deleteSessionByToken(token);

  clearSessionCookie(res);
  return res.status(204).end();
}
