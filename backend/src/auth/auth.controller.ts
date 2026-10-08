import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.ts";
import { loginSchema } from "./auth.schema.ts";
import { findSessionUser, login } from "./auth.service.ts";
import {
	clearSessionCookie,
	deleteSessionByToken,
	SESSION_COOKIE_NAME,
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

export async function getCurrentSession(req: Request, res: Response) {
	const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
	const user = typeof token === "string" ? await findSessionUser(token) : null;

	if (!user) {
		clearSessionCookie(res);
		throw new AppError("UNAUTHENTICATED", "Non authentifié");
	}

	return res.status(200).json({ user });
}

export async function logoutUser(req: Request, res: Response) {
	const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
	if (typeof token === "string") {
		await deleteSessionByToken(token);
	}

	clearSessionCookie(res);
	return res.status(204).end();
}
