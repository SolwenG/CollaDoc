import { getJson } from './api'

export interface DocumentParticipant {
    id: number
    username: string
    displayName: string
    role: 'OWNER' | 'EDITOR' | 'VIEWER'
}

export async function fetchDocumentParticipants(
    documentId: number
): Promise<DocumentParticipant[] | null> {
    const response = await getJson<{ participants: DocumentParticipant[] }>(
        `/documents/${documentId}/participants`
    )
    return response?.participants ?? null
}
