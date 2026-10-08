import { findUserForAuth } from "../users/users.service.ts";
import { findSessionByToken } from "./session.ts";

export type TokenCheck =
	| { status: "unknown" }
	| { status: "expired" }
	| { status: "mfaPending"; session: { id: number }; user: { id: number } }
	| { status: "userUnavailable" }
	| {
			status: "valid";
			session: { id: number; lastUsedAt: string };
			user: { id: number; role: "USER" | "ADMIN" };
	  };

export async function checkSessionToken(
	token: string,
	now = Date.now(),
): Promise<TokenCheck> {
	const session = await findSessionByToken(token);
	if (!session) return { status: "unknown" };

	if (new Date(session.expiresAt).getTime() <= now)
		return { status: "expired" };

	const user = await findUserForAuth(session.userId);
	if (!user || user.blockedAt !== null) return { status: "userUnavailable" };

	if (!session.mfaSatisfied)
		return {
			status: "mfaPending",
			session: { id: session.id },
			user: { id: user.id },
		};

	return {
		status: "valid",
		session: { id: session.id, lastUsedAt: session.lastUsedAt },
		user: { id: user.id, role: user.role },
	};
}
