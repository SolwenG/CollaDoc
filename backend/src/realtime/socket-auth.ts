import { checkSessionToken } from '../auth/authenticate.ts'
import { SESSION_COOKIE_NAME } from '../auth/session.ts'
import type { CollabSocket } from './socket.types.ts'

function readCookie(header: string | undefined, name: string): string | null {
    if (!header) return null
    for (const part of header.split(';')) {
        const [key, ...value] = part.trim().split('=')
        if (key !== name) continue
        try {
            return decodeURIComponent(value.join('='))
        } catch {
            return null
        }
    }
    return null
}

// Same checks as requireAuth, done once when the socket connects
export async function authenticateSocket(
    socket: CollabSocket,
    next: (error?: Error) => void
): Promise<void> {
    try {
        const token = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE_NAME)
        if (!token) return next(new Error('UNAUTHENTICATED'))

        const check = await checkSessionToken(token)
        if (check.status !== 'valid') return next(new Error('UNAUTHENTICATED'))

        socket.data = { userId: check.user.id, token, documentIds: new Set() }
        next()
    } catch (error) {
        console.error(error)
        next(new Error('UNAUTHENTICATED'))
    }
}
