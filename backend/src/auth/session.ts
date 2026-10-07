import { createHash, randomBytes } from "node:crypto"
import { db } from "../prisma/db.ts"

export const SESSION_COOKIE_NAME = "colladoc_session",
  SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000,
  PENDING_MFA_SESSION_TTL_MS = 5 * 60 * 1000,
  SESSION_REFRESH_THRESHOLD_MS = 1 * 60 * 1000

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession({ userId, mfaVerified }: { userId: number, mfaVerified: boolean }) {
  const token = generateSessionToken(),
    tokenHash = hashSessionToken(token),
    now = Date.now(),
    expiresAt = computeExpirationTime({ mfaVerified, now }).toISOString()

  await db.orm.public.Session.create({
    tokenHash,
    expiresAt,
    userId,
    mfaVerified,
  })
  return { token, expiresAt }
}

export async function findSessionByToken(token: string) {
  const tokenHash = hashSessionToken(token)
  return db.orm.public.Session.select('id', 'userId', 'mfaVerified', 'expiresAt', 'lastUsedAt').where({ tokenHash }).first()
}

export async function refreshSession(sessionId: number) {
  const now = Date.now()
  const expiresAt = computeExpirationTime({ mfaVerified: true, now }).toISOString()
  return db.orm.public.Session.select('expiresAt').where({ id: sessionId }).update({ expiresAt, lastUsedAt: new Date(now).toISOString() })
}

function computeExpirationTime({ mfaVerified, now }: { mfaVerified: boolean, now: number }): Date {
  const expirationTime = mfaVerified ? SESSION_TTL_MS : PENDING_MFA_SESSION_TTL_MS
  const expiresAt = now + expirationTime
  return new Date(expiresAt)
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token)
  await db.orm.public.Session.where({ tokenHash }).delete()
}
