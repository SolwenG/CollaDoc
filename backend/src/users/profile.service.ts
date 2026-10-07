import { hashPassword, verifyPassword } from "../auth/password.ts";
import type { ProfileRow } from "./profile.repository.ts";
import * as profileRepository from "./profile.repository.ts";

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

export async function getProfile(userId: number) {
	const row = await profileRepository.findProfile(userId);
	return row ? toProfile(row) : null;
}

export async function updateDisplayName(userId: number, displayName: string) {
	const row = await profileRepository.updateDisplayName(userId, displayName);
	return row ? toProfile(row) : null;
}

// Returns null when the user no longer exists.
export async function isCurrentPassword(userId: number, password: string) {
	const currentHash = await profileRepository.findPasswordHash(userId);
	if (!currentHash) return null;
	return verifyPassword(currentHash, password);
}

export async function changePassword(
	userId: number,
	sessionId: number,
	newPassword: string,
) {
	const newHash = await hashPassword(newPassword);
	await profileRepository.replacePassword(userId, newHash, sessionId);
}
