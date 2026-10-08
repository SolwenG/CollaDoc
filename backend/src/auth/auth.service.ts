import { AppError } from "../errors/app-error.ts";
import { findUserForLogin } from "../users/users.service.ts";
import type { LoginInput } from "./auth.schema.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { createSession } from "./session.ts";

// Verified against when the username does not exist, so that an unknown
// username takes as long to reject as a wrong password.
const DUMMY_PASSWORD_HASH = await hashPassword("dummy-password-for-timing");

export async function login({ username, password }: LoginInput) {
	const user = await findUserForLogin(username);

	// Always run argon2: answering faster without a user would reveal which usernames exist
	const passwordMatches = await verifyPassword(
		user?.passwordHash ?? DUMMY_PASSWORD_HASH,
		password,
	);

	if (!user || !passwordMatches) {
		throw new AppError("INVALID_CREDENTIALS", "Invalid username or password");
	}

	// Checked after the password, so only the account owner learns it is blocked
	if (user.blockedAt !== null) {
		throw new AppError("ACCOUNT_BLOCKED", "This account is blocked");
	}

	const mfaSatisfied = user.totpEnabledAt === null;
	const { token, expiresAt } = await createSession({
		userId: user.id,
		mfaSatisfied,
	});

	return {
		user: {
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			role: user.role,
		},
		token,
		expiresAt,
		mfaRequired: !mfaSatisfied,
	};
}
