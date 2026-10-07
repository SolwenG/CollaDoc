import type { Request, RequestHandler } from "express";
import { AppError } from "../errors/app-error.ts";

// Contract shared with the login middleware: what an authenticated request carries.
export type AuthUser = {
	id: number;
	sessionId: number;
};

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser;
		}
	}
}

// TEMPORARY STUB until the real login middleware lands.
// The real one must: read the session cookie, look up Session by SHA-256 of the token,
// reject expired sessions, and reject sessions with mfaVerified = false
// only when the user has MFA enabled (totpEnabledAt != null).
//
// Meanwhile, outside production, the user is taken from the X-Dev-User-Id header
// (and optionally X-Dev-Session-Id).
export const requireAuth: RequestHandler = (req, _res, next) => {
	if (process.env["NODE_ENV"] === "production") {
		throw new AppError("UNAUTHENTICATED", "Non authentifié");
	}

	const id = Number(req.get("x-dev-user-id"));
	const sessionId = Number(req.get("x-dev-session-id") ?? 0);

	if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(sessionId)) {
		throw new AppError("UNAUTHENTICATED", "Non authentifié");
	}

	req.user = { id, sessionId };
	next();
};

// For handlers mounted behind requireAuth: returns the user or fails with 401.
export function getAuthUser(req: Request): AuthUser {
	if (!req.user) throw new AppError("UNAUTHENTICATED", "Non authentifié");
	return req.user;
}
