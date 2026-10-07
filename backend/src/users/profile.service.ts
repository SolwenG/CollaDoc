import {
	assertPasswordPolicy,
	hashPassword,
	verifyPassword,
} from "../auth/password.ts";
import { AppError } from "../errors/app-error.ts";
import * as profileRepository from "./profile.repository.ts";
import type { ProfileRow } from "./profile.repository.ts";
import type { ChangePasswordInput } from "./profile.schemas.ts";

export function toProfile(row: ProfileRow) {
	return {
		id: row.id,
		username: row.username,
		displayName: row.displayName,
		role: row.role,
		mfaEnabled: row.totpEnabledAt !== null,
		mustChangePassword: row.mustChangePassword,
		createdAt: row.createdAt,
	};
}

export function assertValidNewPassword(currentPassword: string, newPassword: string) {
	if (newPassword === currentPassword) {
		throw new AppError(
			"PASSWORD_UNCHANGED",
			"Le nouveau mot de passe doit être différent de l'actuel",
		);
	}
	assertPasswordPolicy(newPassword);
}

// The user behind a valid session can only be missing if deleted meanwhile.
function userGone() {
	return new AppError("UNAUTHENTICATED", "Non authentifié");
}

export async function getProfile(userId: number) {
	const row = await profileRepository.findProfile(userId);
	if (!row) throw userGone();
	return toProfile(row);
}

export async function updateDisplayName(userId: number, displayName: string) {
	const row = await profileRepository.updateDisplayName(userId, displayName);
	if (!row) throw userGone();
	return toProfile(row);
}

export async function changePassword(
	userId: number,
	sessionId: number,
	{ currentPassword, newPassword }: ChangePasswordInput,
) {
	// Pure checks first: no argon2 cost for a request that will fail anyway.
	assertValidNewPassword(currentPassword, newPassword);

	const currentHash = await profileRepository.findPasswordHash(userId);
	if (!currentHash) throw userGone();

	if (!(await verifyPassword(currentHash, currentPassword))) {
		throw new AppError("INVALID_CURRENT_PASSWORD", "Mot de passe actuel incorrect");
	}

	const newHash = await hashPassword(newPassword);
	await profileRepository.replacePassword(userId, newHash, sessionId);
}
