import type { Request, Response } from "express";
import { loginSchema } from "./auth.schema.ts";
import { login } from "./auth.service.ts";
import { setSessionCookie } from "./session.ts";

export async function loginUser(req: Request, res: Response) {
	const credentials = loginSchema.parse(req.body);
	const { user, token, expiresAt, mfaRequired } = await login(credentials);

	setSessionCookie(res, token, expiresAt);

	if (mfaRequired) {
		return res.status(200).json({ mfaRequired: true });
	}

	return res.status(200).json({ user });
}
