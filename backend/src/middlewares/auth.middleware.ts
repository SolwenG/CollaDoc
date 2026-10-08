import type { NextFunction, Request, Response } from "express";
import {
	clearSessionCookie,
	deleteSessionByToken,
	findSessionByToken,
	readSessionToken,
	refreshSession,
	SESSION_REFRESH_THRESHOLD_MS,
	setSessionCookie,
} from "../auth/session.ts";
import { AppError } from "../errors/app-error.ts";
import { findUserForAuth } from "../users/users.service.ts";

// What an authenticated request carries, set by requireAuth
export type AuthUser = {
	id: number;
	sessionId: number;
	role: "USER" | "ADMIN";
};

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser;
		}
	}
}

function unauthenticated(): AppError {
	return new AppError("UNAUTHENTICATED", "Authentication required");
}

// Drops a session that can never become valid again, in the database and in the browser
async function revokeSession(res: Response, token: string): Promise<void> {
	await deleteSessionByToken(token);
	clearSessionCookie(res);
}

export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const token = readSessionToken(req);
	if (!token) throw unauthenticated();

	const session = await findSessionByToken(token);
	if (!session) {
		clearSessionCookie(res);
		throw unauthenticated();
	}

	const now = Date.now();
	if (new Date(session.expiresAt).getTime() <= now) {
		await revokeSession(res, token);
		throw unauthenticated();
	}

	// Password checked but 2FA code still pending: kept alive for its 5 minutes, no access yet
	if (!session.mfaSatisfied) throw unauthenticated();

	const user = await findUserForAuth(session.userId);
	if (!user || user.blockedAt !== null) {
		await revokeSession(res, token);
		throw unauthenticated();
	}

	if (now - new Date(session.lastUsedAt).getTime() >= SESSION_REFRESH_THRESHOLD_MS) {
		const refreshed = await refreshSession(session.id);
		if (refreshed) setSessionCookie(res, token, refreshed.expiresAt);
	}

	req.user = { id: user.id, sessionId: session.id, role: user.role };
	next();
}

export function getAuthUser(req: Request): AuthUser {
	if (!req.user) throw unauthenticated();
	return req.user;
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
	const user = getAuthUser(req);
	if (user.role !== "ADMIN") {
		throw new AppError("FORBIDDEN", "Admin access required");
	}
	next();
}
