const TIMEOUT_MS = 2000

async function notify(path: string): Promise<void> {
    const baseUrl = process.env['REALTIME_INTERNAL_URL'] ?? 'http://localhost:3001'
    try {
        const response = await fetch(`${baseUrl}/internal${path}`, {
            method: 'POST',
            headers: { 'x-internal-secret': process.env['INTERNAL_SECRET'] ?? '' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!response.ok) console.error(`Realtime notification ${path} failed: ${response.status}`)
    } catch (error) {
        console.error(`Realtime notification ${path} failed`, error)
    }
}

export function notifySessionsChanged(userId: number): Promise<void> {
    return notify(`/users/${userId}/sessions-changed`)
}

export function notifyDocumentDeleted(documentId: number): Promise<void> {
    return notify(`/documents/${documentId}/deleted`)
}

export function notifyAccessRevoked(documentId: number, userId: number): Promise<void> {
    return notify(`/documents/${documentId}/members/${userId}/revoked`)
}

export function notifyRoleChanged(documentId: number, userId: number): Promise<void> {
    return notify(`/documents/${documentId}/members/${userId}/role-changed`)
}
