// Shared error vocabulary: thrown by services, translated into HTTP responses
// by middlewares/errors.middleware.ts. Must not depend on Express.

const STATUS_BY_CODE = {
    VALIDATION_ERROR: 400,
    INVALID_CURRENT_PASSWORD: 400,
    INVALID_MFA_CODE: 400,
    PASSWORD_UNCHANGED: 400,
    PASSWORD_TOO_SHORT: 400,
    PASSWORD_TOO_LONG: 400,
    FILE_REQUIRED: 400,
    FOLDER_MOVE_CYCLE: 400,
    NOT_A_FILE: 400,
    INVALID_CREDENTIALS: 401,
    UNAUTHENTICATED: 401,
    ACCOUNT_BLOCKED: 403,
    FORBIDDEN: 403,
    CANNOT_BLOCK_SELF: 403,
    CANNOT_REMOVE_OWNER: 403,
    CANNOT_CHANGE_OWNER_ROLE: 403,
    USER_NOT_FOUND: 404,
    FOLDER_NOT_FOUND: 404,
    DOCUMENT_NOT_FOUND: 404,
    MEMBER_NOT_FOUND: 404,
    SHARE_LINK_NOT_FOUND: 404,
    USERNAME_TAKEN: 409,
    FOLDER_NAME_TAKEN: 409,
    MFA_ALREADY_ENABLED: 409,
    MFA_SETUP_NOT_STARTED: 409,
    SHARE_LINK_EXPIRED: 410,
    SHARE_LINK_REVOKED: 410,
    FILE_TOO_LARGE: 413,
    UNSUPPORTED_FILE_TYPE: 415,
    TOO_MANY_ATTEMPTS: 429,
    INTERNAL_ERROR: 500,
} as const

export type ErrorCode = keyof typeof STATUS_BY_CODE

export class AppError extends Error {
    readonly code: ErrorCode
    readonly status: number
    readonly details?: unknown

    constructor(code: ErrorCode, message: string, details?: unknown) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.status = STATUS_BY_CODE[code]
        this.details = details
    }
}
