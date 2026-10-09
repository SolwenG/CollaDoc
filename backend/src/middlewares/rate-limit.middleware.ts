import type { Request } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { AppError } from '../errors/app-error.ts'
import { normalizedUsernameSchema } from '../users/users.schema.ts'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_ATTEMPTS_PER_ACCOUNT = 5
const LOGIN_ATTEMPTS_PER_IP = 50

/** ipKeyGenerator groups an IPv6 /56 into one key: a single client owns the whole range */
function clientKey(req: Request): string {
    return ipKeyGenerator(req.ip ?? '')
}

/** Normalized like the login itself, so "Alice" and " alice" share one counter */
function attemptedUsername(req: Request): string {
    const result = normalizedUsernameSchema.safeParse(req.body?.username)
    return result.success ? result.data : ''
}

function createLoginLimiter(
    limit: number,
    keyGenerator: (req: Request) => string
) {
    return rateLimit({
        windowMs: LOGIN_WINDOW_MS,
        limit,
        keyGenerator,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        // Through errorHandler, so the 429 has the same body as every other API error
        handler: (_req, _res, next) => {
            next(
                new AppError(
                    'TOO_MANY_ATTEMPTS',
                    'Too many login attempts, try again later'
                )
            )
        },
    })
}

export const loginRateLimiters = [
    // Password spraying: one password tried on many accounts from one IP
    createLoginLimiter(LOGIN_ATTEMPTS_PER_IP, clientKey),
    // Brute force: many passwords tried on one account
    createLoginLimiter(
        LOGIN_ATTEMPTS_PER_ACCOUNT,
        (req) => `${clientKey(req)}:${attemptedUsername(req)}`
    ),
]
