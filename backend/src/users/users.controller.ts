import type { Request, Response } from 'express'
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth/password.ts'
import { AppError } from '../errors/app-error.ts'
import { registerSchema } from './users.schema.ts'
import { createAccount, findByUsername } from './users.service.ts'

export async function registerUser(req: Request, res: Response) {
    const { username, displayName, password } = registerSchema.parse(req.body)

    const existingUser = await findByUsername(username)
    if (existingUser) {
        throw new AppError('USERNAME_TAKEN', 'Username already taken')
    }

    const length = password.length

    if (length < PASSWORD_MIN_LENGTH) {
        throw new AppError(
            'PASSWORD_TOO_SHORT',
            `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`
        )
    }

    if (length > PASSWORD_MAX_LENGTH) {
        throw new AppError(
            'PASSWORD_TOO_LONG',
            `Le mot de passe ne doit pas contenir plus de ${PASSWORD_MAX_LENGTH} caractères`
        )
    }

    const passwordHash = await hashPassword(password)

    const user = await createAccount({
        username,
        displayName,
        passwordHash,
    })

    return res.status(201).json({ user })
}
