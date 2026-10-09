import type { Request, Response } from 'express'
import { getAuthUser, getPendingMfa } from '../../middlewares/auth.middleware.ts'
import { mfaCodeSchema, mfaSetupSchema } from '../auth.schema.ts'
import { completeMfaLogin, confirmMfaSetup, startMfaSetup } from './mfa.service.ts'
import { setSessionCookie } from '../session.ts'

export async function setupMfa(req: Request, res: Response) {
    const { id } = getAuthUser(req)
    const input = mfaSetupSchema.parse(req.body)
    const setup = await startMfaSetup(id, input)

    // The plain secret must not linger in a browser or proxy cache
    res.set('Cache-Control', 'no-store')
    return res.status(200).json(setup)
}

export async function enableMfa(req: Request, res: Response) {
    const { id } = getAuthUser(req)
    const input = mfaCodeSchema.parse(req.body)
    await confirmMfaSetup(id, input)

    return res.status(204).end()
}

export async function verifyMfa(req: Request, res: Response) {
    const pending = getPendingMfa(req)
    const input = mfaCodeSchema.parse(req.body)
    const { user, token, expiresAt } = await completeMfaLogin(pending, input)

    setSessionCookie(res, token, expiresAt)
    return res.status(200).json({ user })
}
