import { AppError } from '../../errors/app-error.ts'
import type { PendingMfa } from '../../middlewares/auth.middleware.ts'
import { db } from '../../prisma/db.ts'
import type { MfaCodeInput, MfaSetupInput } from '../auth.schema.ts'
import { verifyPassword } from '../password.ts'
import { createSession, deleteSessionById } from '../session.ts'
import { MFA_ATTEMPTS_RESET, reserveMfaAttempt } from './mfa-attempts.ts'
import { createTotpSetup, verifyTotpCode } from './totp.ts'

function mfaAlreadyEnabled(): AppError {
    return new AppError('MFA_ALREADY_ENABLED', 'MFA is already enabled')
}

/** Holds the password hash and the encrypted secret: never send this row to the client */
async function findUserForMfa(id: number) {
    return db.orm.public.User.select(
        'id',
        'username',
        'displayName',
        'role',
        'passwordHash',
        'totpSecret',
        'totpEnabledAt',
        'totpLastUsedStep'
    )
        .where({ id })
        .first()
}

export async function startMfaSetup(
    userId: number,
    { password }: MfaSetupInput
) {
    const user = await findUserForMfa(userId)
    if (!user) throw new AppError('UNAUTHENTICATED', 'Authentication required')

    if (user.totpEnabledAt !== null) throw mfaAlreadyEnabled()

    await reserveMfaAttempt(user.id)

    const passwordMatches = await verifyPassword(user.passwordHash, password)
    if (!passwordMatches) {
        throw new AppError('INVALID_CURRENT_PASSWORD', 'Invalid password')
    }

    const { secret, otpauthUrl, qrCodeDataUrl, encryptedSecret } =
        await createTotpSetup(user.username)

    const saved = await db.orm.public.User.select('id')
        .where({ id: user.id, totpEnabledAt: null })
        .update({ totpSecret: encryptedSecret, ...MFA_ATTEMPTS_RESET })
    if (!saved) throw mfaAlreadyEnabled()

    return { secret, otpauthUrl, qrCodeDataUrl }
}

export async function confirmMfaSetup(
    userId: number,
    { code }: MfaCodeInput
): Promise<void> {
    const user = await findUserForMfa(userId)
    if (!user) throw new AppError('UNAUTHENTICATED', 'Authentication required')

    if (user.totpEnabledAt !== null) throw mfaAlreadyEnabled()
    if (user.totpSecret === null) {
        throw new AppError('MFA_SETUP_NOT_STARTED', 'Start the MFA setup first')
    }

    await reserveMfaAttempt(user.id)
    const step = await verifyTotpCode({
        encryptedSecret: user.totpSecret,
        code,
        lastUsedStep: user.totpLastUsedStep,
    })
    if (step === null)
        throw new AppError('INVALID_MFA_CODE', 'Invalid MFA code')

    // Bound to the secret the code was checked against: a setup replayed in between
    // replaced it, and that new QR code has not been confirmed yet
    const enabled = await db.orm.public.User.select('id')
        .where({
            id: user.id,
            totpEnabledAt: null,
            totpSecret: user.totpSecret,
        })
        .update({
            totpEnabledAt: new Date().toISOString(),
            totpLastUsedStep: step,
            ...MFA_ATTEMPTS_RESET,
        })
    if (!enabled) {
        throw new AppError(
            'MFA_SETUP_NOT_STARTED',
            'The MFA setup changed, scan the new QR code'
        )
    }
}

export async function completeMfaLogin(
    { userId, sessionId }: PendingMfa,
    { code }: MfaCodeInput
) {
    const user = await findUserForMfa(userId)
    if (!user || user.totpSecret === null || user.totpEnabledAt === null) {
        throw new AppError('UNAUTHENTICATED', 'Authentication required')
    }

    await reserveMfaAttempt(user.id)
    const step = await verifyTotpCode({
        encryptedSecret: user.totpSecret,
        code,
        lastUsedStep: user.totpLastUsedStep,
    })
    if (step === null)
        throw new AppError('INVALID_MFA_CODE', 'Invalid MFA code')

    // Two requests racing with the same code both pass verifyTotpCode: only one can move the step
    const recorded = await db.orm.public.User.select('id')
        .where({ id: user.id, totpLastUsedStep: user.totpLastUsedStep })
        .update({ totpLastUsedStep: step, ...MFA_ATTEMPTS_RESET })
    if (!recorded) throw new AppError('INVALID_MFA_CODE', 'Invalid MFA code')

    // New privilege level, new token (OWASP session fixation): the pending one is dropped
    await deleteSessionById(sessionId)
    const { token, expiresAt } = await createSession({
        userId: user.id,
        mfaSatisfied: true,
    })

    return {
        user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
        },
        token,
        expiresAt,
    }
}
