export interface Call {
    id: string
    documentId: number
    callerId: number
    calleeId: number
    callerSocketId: string
    calleeSocketId?: string
    state: 'ringing' | 'active'
    timeout?: NodeJS.Timeout
}

export interface CallSignal {
    callId: string
    description?: { type: 'offer' | 'answer'; sdp?: string }
    candidate?: Record<string, unknown>
}

export interface IncomingCall {
    callId: string
    documentId: number
    from: { id: number; displayName: string }
}

export interface ClientToServerEvents {
    'call:invite': (
        payload: { documentId: number; targetUserId: number },
        ack?: (
            res: { ok: true; callId: string } | { ok: false; error: string }
        ) => void
    ) => void
    'call:accept': (payload: { callId: string }) => void
    'call:hangup': (payload: { callId: string }) => void
    'call:signal': (payload: CallSignal) => void
}

export interface ServerToClientEvents {
    'call:incoming': (payload: IncomingCall) => void
    'call:accepted': (payload: { callId: string }) => void
    'call:signal': (payload: CallSignal) => void
    'call:ended': (payload: { callId: string; reason: string }) => void
}
