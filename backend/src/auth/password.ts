import argon2 from 'argon2'
import { randomInt } from 'node:crypto'

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 80

export function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id })
}

export function verifyPassword(
    hash: string,
    password: string
): Promise<boolean> {
    return argon2.verify(hash, password)
}

// No look-alike characters (0/O, 1/l/I) so the password can be read out or copied by hand
const TEMPORARY_PASSWORD_ALPHABET =
    'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?'
const TEMPORARY_PASSWORD_LENGTH = 16

export function generateTemporaryPassword(): string {
    let password = ''
    for (let i = 0; i < TEMPORARY_PASSWORD_LENGTH; i++) {
        password +=
            TEMPORARY_PASSWORD_ALPHABET[
                randomInt(TEMPORARY_PASSWORD_ALPHABET.length)
            ]
    }
    return password
}
