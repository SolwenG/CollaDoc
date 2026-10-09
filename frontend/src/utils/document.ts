import { getJson } from './api'

export interface DocumentMember {
    id: number
    username: string
    displayName: string
    isOwner: boolean
}

export async function fetchDocumentMembers(documentId: number): Promise<DocumentMember[] | null> {
    const response = await getJson<{ members: DocumentMember[] }>(`/documents/${documentId}/members`)
    return response?.members ?? null
}
