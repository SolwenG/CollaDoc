import type { CookieOptions, Request, Response } from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { db } from '../prisma/db.ts'

export const SESSION_COOKIE_NAME = 'colladoc_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const PENDING_MFA_SESSION_TTL_MS = 5 * 60 * 1000
export const SESSION_REFRESH_THRESHOLD_MS = 1 * 60 * 1000

/** Secure by default: only an explicit "false" (local http dev, REST Client) sends the cookie over plain http */
function loadCookieSecure(): boolean {
    const value = process.env['COOKIE_SECURE'] ?? 'true'
    if (value !== 'true' && value !== 'false') {
        throw new Error('COOKIE_SECURE must be "true" or "false"')
    }
    return value === 'true'
}

const SESSION_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: loadCookieSecure(),
    path: '/',
}

type CreateSession = {
    userId: number
    mfaSatisfied: boolean
}

export function generateSessionToken(): string {
    return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export async function createSession({ userId, mfaSatisfied }: CreateSession) {
    const token = generateSessionToken()
    const tokenHash = hashSessionToken(token)
    const expiresAt = computeExpirationTime({
        mfaSatisfied,
        now: Date.now(),
    }).toISOString()

    await db.orm.public.Session.create({
        tokenHash,
        expiresAt,
        userId,
        mfaSatisfied,
    })

    return { token, expiresAt }
}

export async function findSessionByToken(token: string) {
    const tokenHash = hashSessionToken(token)
    return db.orm.public.Session.select('id', 'userId', 'mfaSatisfied', 'expiresAt', 'lastUsedAt')
        .where({ tokenHash })
        .first()
}

export async function refreshSession(sessionId: number) {
    const now = Date.now()
    const expiresAt = computeExpirationTime({
        mfaSatisfied: true,
        now,
    }).toISOString()

    return db.orm.public.Session.select('expiresAt')
        .where({ id: sessionId })
        .update({ expiresAt, lastUsedAt: new Date(now).toISOString() })
}

function computeExpirationTime({
    mfaSatisfied,
    now,
}: {
    mfaSatisfied: boolean
    now: number
}): Date {
    const expirationTime = mfaSatisfied ? SESSION_TTL_MS : PENDING_MFA_SESSION_TTL_MS
    return new Date(now + expirationTime)
}

export async function deleteSessionByToken(token: string): Promise<void> {
    const tokenHash = hashSessionToken(token)
    await db.orm.public.Session.where({ tokenHash }).delete()
}

export async function deleteSessionById(sessionId: number): Promise<void> {
    await db.orm.public.Session.where({ id: sessionId }).delete()
}

export function setSessionCookie(res: Response, token: string, expiresAt: string) {
    res.cookie(SESSION_COOKIE_NAME, token, {
        ...SESSION_COOKIE_OPTIONS,
        expires: new Date(expiresAt),
    })
}

export function clearSessionCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS)
}

export function readSessionToken(req: Request): string | null {
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME]
    return typeof token === 'string' && token !== '' ? token : null
}
