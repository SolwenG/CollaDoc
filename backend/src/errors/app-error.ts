// Shared error vocabulary: thrown by services, translated into HTTP responses
// by middlewares/errors.middleware.ts. Must not depend on Express.

const STATUS_BY_CODE = {
	VALIDATION_ERROR: 400,
	INVALID_CURRENT_PASSWORD: 400,
	PASSWORD_UNCHANGED: 400,
	PASSWORD_TOO_SHORT: 400,
	PASSWORD_TOO_LONG: 400,
	UNAUTHENTICATED: 401,
	USER_NOT_FOUND: 404,
	USERNAME_TAKEN: 409,
	TOO_MANY_ATTEMPTS: 429,
	INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof STATUS_BY_CODE;

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
