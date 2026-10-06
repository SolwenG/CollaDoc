import type { ErrorRequestHandler } from "express";
import { z } from "zod";

const STATUS_BY_CODE = {
	VALIDATION_ERROR: 400,
	INVALID_CURRENT_PASSWORD: 400,
	PASSWORD_UNCHANGED: 400,
	PASSWORD_TOO_SHORT: 400,
	PASSWORD_TOO_LONG: 400,
	UNAUTHENTICATED: 401,
	TOO_MANY_ATTEMPTS: 429,
	INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof STATUS_BY_CODE;

export type ErrorBody = {
	error: {
		code: ErrorCode;
		message: string;
		details?: unknown;
	};
};

export class AppError extends Error {
	readonly code: ErrorCode;
	readonly status: number;
	readonly details?: unknown;

	constructor(code: ErrorCode, message: string, details?: unknown) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.status = STATUS_BY_CODE[code];
		this.details = details;
	}
}

export function toErrorBody(err: AppError): ErrorBody {
	const body: ErrorBody = { error: { code: err.code, message: err.message } };
	if (err.details !== undefined) body.error.details = err.details;
	return body;
}

export function normalizeError(err: unknown): AppError {
	if (err instanceof AppError) return err;

	if (err instanceof z.ZodError) {
		return new AppError(
			"VALIDATION_ERROR",
			"Données invalides",
			z.flattenError(err).fieldErrors,
		);
	}

	if (isBodyParserError(err)) {
		return new AppError("VALIDATION_ERROR", "Corps de requête invalide");
	}

	return new AppError("INTERNAL_ERROR", "Erreur interne");
}

function isBodyParserError(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"type" in err &&
		err.type === "entity.parse.failed"
	);
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	const appError = normalizeError(err);
	if (appError.code === "INTERNAL_ERROR") console.error(err);
	res.status(appError.status).json(toErrorBody(appError));
};
