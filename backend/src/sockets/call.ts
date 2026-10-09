import { randomUUID } from 'node:crypto'
import type { Server, Socket } from 'socket.io'
import { db } from '../prisma/db.ts'
import type { Call, CallSignal } from 'shared/call/types'

type Ack = (
    res: { ok: true; callId: string } | { ok: false; error: string }
) => void

const calls = new Map<string, Call>()
const RING_TIMEOUT_MS = 30_000

// Propriétaire OU membre du document
async function canAccessDocument(
    userId: number,
    documentId: number
): Promise<boolean> {
    const doc = await db.orm.public.Document.select('ownerId')
        .where({ id: documentId })
        .first()
    if (!doc) return false
    if (doc.ownerId === userId) return true

    const member = await db.orm.public.DocumentMember.select('userId')
        .where({ documentId, userId })
        .first()
    return Boolean(member)
}

// Présent = au moins un socket de cet utilisateur dans la room du document
async function isPresentOnDocument(
    io: Server,
    userId: number,
    documentId: number
) {
    const sockets = await io.in(`doc:${documentId}`).fetchSockets()
    return sockets.some((s) => s.data.userId === userId)
}

async function getDisplayName(userId: number): Promise<string> {
    const user = await db.orm.public.User.select('displayName')
        .where({ id: userId })
        .first()
    return user?.displayName ?? 'Utilisateur'
}

const isBusy = (userId: number) =>
    [...calls.values()].some(
        (c) => c.callerId === userId || c.calleeId === userId
    )

function endCall(io: Server, call: Call, reason: string) {
    if (!calls.delete(call.id)) return // déjà terminé
    clearTimeout(call.timeout)
    // Les clients ignorent les callId qui ne les concernent pas
    io.to(`user:${call.callerId}`)
        .to(`user:${call.calleeId}`)
        .emit('call:ended', { callId: call.id, reason })
}

export function registerCallHandlers(io: Server, socket: Socket) {
    const userId: number = socket.data.userId

    socket.on(
        'call:invite',
        async (p: { documentId: number; targetUserId: number }, ack?: Ack) => {
            try {
                if (
                    !Number.isInteger(p?.documentId) ||
                    !Number.isInteger(p?.targetUserId)
                ) {
                    return ack?.({ ok: false, error: 'invalid_target' })
                }
                if (p.targetUserId === userId)
                    return ack?.({ ok: false, error: 'invalid_target' })

                // 1. Accès au document pour les deux
                const [a, b] = await Promise.all([
                    canAccessDocument(userId, p.documentId),
                    canAccessDocument(p.targetUserId, p.documentId),
                ])
                if (!a || !b) return ack?.({ ok: false, error: 'forbidden' })

                // 2. Les deux sont présents sur le document
                const [callerHere, calleeHere] = await Promise.all([
                    isPresentOnDocument(io, userId, p.documentId),
                    isPresentOnDocument(io, p.targetUserId, p.documentId),
                ])
                if (!callerHere) return ack?.({ ok: false, error: 'forbidden' })
                if (!calleeHere)
                    return ack?.({ ok: false, error: 'not_present' })

                // 3. Occupé (re-vérifié après les await pour limiter les courses)
                if (isBusy(userId) || isBusy(p.targetUserId))
                    return ack?.({ ok: false, error: 'busy' })

                const call: Call = {
                    id: randomUUID(),
                    documentId: p.documentId,
                    callerId: userId,
                    calleeId: p.targetUserId,
                    callerSocketId: socket.id,
                    state: 'ringing',
                }
                call.timeout = setTimeout(
                    () => endCall(io, call, 'timeout'),
                    RING_TIMEOUT_MS
                )
                calls.set(call.id, call)

                io.to(`user:${p.targetUserId}`).emit('call:incoming', {
                    callId: call.id,
                    documentId: p.documentId,
                    from: {
                        id: userId,
                        displayName: await getDisplayName(userId),
                    },
                })
                ack?.({ ok: true, callId: call.id })
            } catch {
                ack?.({ ok: false, error: 'server_error' })
            }
        }
    )

    socket.on('call:accept', (p: { callId: string }) => {
        const call = calls.get(p?.callId)
        if (!call || call.calleeId !== userId || call.state !== 'ringing')
            return
        clearTimeout(call.timeout)
        call.state = 'active'
        call.calleeSocketId = socket.id
        // L'appelant est notifié sur l'onglet qui a lancé l'appel
        io.to(call.callerSocketId).emit('call:accepted', { callId: call.id })
        // Les autres onglets du destinataire ferment leur popup
        socket.to(`user:${userId}`).emit('call:ended', {
            callId: call.id,
            reason: 'answered_elsewhere',
        })
    })

    // refus / annulation (ringing) ou raccrochage (active)
    socket.on('call:hangup', (p: { callId: string }) => {
        const call = calls.get(p?.callId)
        if (!call) return
        const isCaller = call.callerId === userId
        const isCallee = call.calleeId === userId
        if (!isCaller && !isCallee) return
        if (
            call.state === 'active' &&
            socket.id !== call.callerSocketId &&
            socket.id !== call.calleeSocketId
        )
            return

        const reason =
            call.state === 'ringing'
                ? isCallee
                    ? 'declined'
                    : 'cancelled'
                : 'hangup'
        endCall(io, call, reason)
    })

    // Relais offer / answer / ICE : uniquement entre les deux sockets de l'appel
    socket.on('call:signal', (p: CallSignal) => {
        const call = calls.get(p?.callId)
        if (!call || call.state !== 'active') return
        const fromCaller = socket.id === call.callerSocketId
        const fromCallee = socket.id === call.calleeSocketId
        if (!fromCaller && !fromCallee) return
        const target = fromCaller ? call.calleeSocketId : call.callerSocketId
        if (target) {
            io.to(target).emit('call:signal', {
                callId: call.id,
                description: p.description,
                candidate: p.candidate,
            })
        }
    })

    // Fin automatique si le socket qui porte l'appel disparaît
    socket.on('disconnect', () => {
        for (const call of [...calls.values()]) {
            if (
                call.callerSocketId === socket.id ||
                call.calleeSocketId === socket.id
            ) {
                endCall(io, call, 'disconnected')
            }
        }
    })
}
