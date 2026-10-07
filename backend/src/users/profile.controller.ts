import type { Request, Response } from "express";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../auth/password.ts";
import { getAuthUser } from "../auth/requireAuth.ts";
import { AppError } from "../errors/app-error.ts";
import {
	changePasswordSchema,
	profileParamsSchema,
	updateProfileSchema,
} from "./profile.schemas.ts";
import * as profileService from "./profile.service.ts";

export async function getProfile(req: Request, res: Response) {
	const { id } = profileParamsSchema.parse(req.params);

	const profile = await profileService.getProfile(id);
	if (!profile) {
		throw new AppError("USER_NOT_FOUND", "Utilisateur introuvable");
	}

	return res.status(200).json({ profile });
}

export async function updateDisplayName(req: Request, res: Response) {
	const { id } = getAuthUser(req);
	const { displayName } = updateProfileSchema.parse(req.body);

	const profile = await profileService.updateDisplayName(id, displayName);
	if (!profile) throw new AppError("UNAUTHENTICATED", "Non authentifié");

	return res.status(200).json({ profile });
}

export async function changePassword(req: Request, res: Response) {
	const { id, sessionId } = getAuthUser(req);
	const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

	if (newPassword === currentPassword) {
		throw new AppError(
			"PASSWORD_UNCHANGED",
			"Le nouveau mot de passe doit être différent de l'actuel",
		);
	}

	const length = newPassword.length;

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

	const isCurrent = await profileService.isCurrentPassword(id, currentPassword);
	if (isCurrent === null) {
		throw new AppError("UNAUTHENTICATED", "Non authentifié");
	}
	if (!isCurrent) {
		throw new AppError(
			"INVALID_CURRENT_PASSWORD",
			"Mot de passe actuel incorrect",
		);
	}

	await profileService.changePassword(id, sessionId, newPassword);

	return res.status(204).end();
}
