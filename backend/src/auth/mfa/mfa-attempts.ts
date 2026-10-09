import { AppError } from "../../errors/app-error.ts";
import { db } from "../../prisma/db.ts";

const MFA_MAX_FAILED_ATTEMPTS = 5;
const MFA_LOCK_DURATION_SECONDS = 15 * 60;

/** Spread into the update that records a success, so the reset rides the same query */
export const MFA_ATTEMPTS_RESET = {
  mfaFailedAttempts: 0,
  mfaLockedUntil: null,
} as const;

/**
 * Counts the attempt BEFORE the password or code is checked, in one atomic UPDATE:
 * concurrent requests queue on the row lock, so none can reuse a stale counter.
 */
export async function reserveMfaAttempt(userId: number): Promise<void> {
  // In SET, every column reads the row as it was BEFORE the update, hence the repeated CASE.
  // A lock that ran out (set but in the past) starts a fresh series at 1.
  const plan = db.raw.sql`
    UPDATE "User"
    SET "mfaFailedAttempts" = CASE WHEN "mfaLockedUntil" IS NULL THEN "mfaFailedAttempts" + 1 ELSE 1 END,
        "mfaLockedUntil" = CASE
          WHEN (CASE WHEN "mfaLockedUntil" IS NULL THEN "mfaFailedAttempts" + 1 ELSE 1 END) >= ${MFA_MAX_FAILED_ATTEMPTS}
          THEN now() + make_interval(secs => ${MFA_LOCK_DURATION_SECONDS})
          ELSE NULL
        END
    WHERE "id" = ${userId}
      AND ("mfaLockedUntil" IS NULL OR "mfaLockedUntil" <= now())
  `
    .affectedCount()
    .build();

  const { affectedRows } = await db.runtime().execute(plan);
  // No row updated: the account is locked (or was deleted in between)
  if (affectedRows === 0) {
    throw new AppError(
      "TOO_MANY_ATTEMPTS",
      "Too many MFA attempts, try again later",
    );
  }
}
