import argon2 from "argon2";
import { AppError } from "../errors/app-error.ts";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 80;

export function assertPasswordPolicy(password: string): void {
	const length = [...password].length;

	if (length < PASSWORD_MIN_LENGTH) {
		throw new AppError(
			"PASSWORD_TOO_SHORT",
			`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
		);
	}

	if (length > PASSWORD_MAX_LENGTH) {
		throw new AppError(
			"PASSWORD_TOO_LONG",
			`Le mot de passe ne doit pas contenir plus de ${PASSWORD_MAX_LENGTH} caractères`,
		);
	}
}

export function hashPassword(password: string): Promise<string> {
	return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
	return argon2.verify(hash, password);
}
