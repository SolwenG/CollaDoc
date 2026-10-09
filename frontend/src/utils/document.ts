import { getJson } from './api'

export interface DocumentMember {
    id: number
    username: string
    displayName: string
    isOwner: boolean
}

export async function fetchDocumentMembers(
    documentId: number
): Promise<DocumentMember[] | null> {
    return getJson<DocumentMember[]>(`/documents/${documentId}/members`)
}
