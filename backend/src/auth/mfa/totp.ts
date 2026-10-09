import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'

const TOTP_ISSUER = 'CollaDoc'
/** One 30 s step on each side, for a phone clock slightly ahead or behind */
const TOTP_EPOCH_TOLERANCE_SECONDS = 30

const CIPHER_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/** Read at import time: a missing or malformed key stops the server at startup, not at the first login */
const ENCRYPTION_KEY = loadEncryptionKey()

function loadEncryptionKey(): Buffer {
    const key = Buffer.from(process.env['TOTP_ENCRYPTION_KEY'] ?? '', 'base64')
    if (key.length !== 32) {
        throw new Error('TOTP_ENCRYPTION_KEY must be 32 bytes encoded in base64')
    }
    return key
}

/** Stored as "iv.tag.ciphertext", each part in base64url ("." is outside that alphabet) */
function encryptSecret(secret: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(CIPHER_ALGORITHM, ENCRYPTION_KEY, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    })
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.')
}

function decryptSecret(encryptedSecret: string): string {
    const [iv, tag, ciphertext] = encryptedSecret.split('.')
    if (!iv || !tag || !ciphertext) {
        throw new Error('Malformed encrypted TOTP secret')
    }
    const decipher = createDecipheriv(
        CIPHER_ALGORITHM,
        ENCRYPTION_KEY,
        Buffer.from(iv, 'base64url'),
        { authTagLength: AUTH_TAG_LENGTH }
    )
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64url')),
        decipher.final(),
    ]).toString('utf8')
}

export type TotpSetup = {
    secret: string
    otpauthUrl: string
    qrCodeDataUrl: string
    encryptedSecret: string
}

/** The plain secret is returned only to be shown once; only encryptedSecret is stored */
export async function createTotpSetup(label: string): Promise<TotpSetup> {
    const secret = generateSecret()
    const otpauthUrl = generateURI({ issuer: TOTP_ISSUER, label, secret })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    return {
        secret,
        otpauthUrl,
        qrCodeDataUrl,
        encryptedSecret: encryptSecret(secret),
    }
}

type VerifyTotpCode = {
    encryptedSecret: string
    code: string
    lastUsedStep: number | null
}

/**
 * Checks a 6-digit code against the stored secret, refusing any step up to `lastUsedStep`.
 * @returns the matched time step, to store as the new replay barrier, or null when the code is refused
 */
export async function verifyTotpCode({
    encryptedSecret,
    code,
    lastUsedStep,
}: VerifyTotpCode): Promise<number | null> {
    const result = await verify({
        secret: decryptSecret(encryptedSecret),
        token: code,
        epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
        afterTimeStep: lastUsedStep ?? undefined,
    })

    return result.valid && 'timeStep' in result ? result.timeStep : null
}
