import { apiFetch, postJson, readApiError, readJson } from '@/utils/api';

export type MemberRole = 'EDITOR' | 'VIEWER';

// Signed by the back, which stores nothing: the token alone carries the link
export interface CreatedShareLink {
  role: MemberRole;
  expiresAt: string;
  token: string;
}

export interface Member {
  role: MemberRole;
  createdAt: string;
  user: { id: number; username: string; displayName: string };
}

export interface AcceptResult {
  documentId: number;
  role: MemberRole | 'OWNER';
  outcome: 'owner' | 'joined' | 'upgraded' | 'unchanged';
}

// The data on success, the error code sent by the back otherwise
export type Result<T> = { ok: true; data: T } | { ok: false; code: string };

const ERROR_MESSAGES: Record<string, string> = {
  SHARE_LINK_NOT_FOUND: "Ce lien d'invitation n'existe pas.",
  SHARE_LINK_EXPIRED:
    "Ce lien d'invitation a expiré. Demandez-en un nouveau au propriétaire du document.",
  VALIDATION_ERROR: "Ce lien d'invitation n'est pas valide.",
  TOO_MANY_ATTEMPTS: 'Trop de liens invalides. Réessayez dans quelques minutes.',
  DOCUMENT_NOT_FOUND: 'Document introuvable.',
  FORBIDDEN: 'Seul le propriétaire peut gérer le partage de ce document.',
  MEMBER_NOT_FOUND: "Cette personne n'est plus membre du document.",
  CANNOT_REMOVE_OWNER: 'Le propriétaire ne peut pas être retiré du document.',
  CANNOT_CHANGE_OWNER_ROLE: 'Le rôle du propriétaire ne peut pas être modifié.',
};

export function sharingErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? 'Une erreur est survenue. Réessayez plus tard.';
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}

async function failure(response: Response): Promise<{ ok: false; code: string }> {
  const error = await readApiError(response);
  return { ok: false, code: error?.code ?? 'INTERNAL_ERROR' };
}

// Reads one field of a JSON answer, or fails when it is missing
async function success<T>(response: Response, field: string): Promise<Result<T>> {
  const body = await readJson<Record<string, T | undefined>>(response);
  const data = body?.[field];
  return data === undefined ? { ok: false, code: 'INTERNAL_ERROR' } : { ok: true, data };
}

export async function createShareLink(
  documentId: number,
  role: MemberRole,
): Promise<Result<CreatedShareLink>> {
  const response = await postJson(`/documents/${documentId}/share-links`, { role });
  return response.ok ? success(response, 'shareLink') : failure(response);
}

export async function fetchMembers(documentId: number): Promise<Result<Member[]>> {
  const response = await apiFetch(`/documents/${documentId}/members`);
  return response.ok ? success(response, 'members') : failure(response);
}

export async function updateMemberRole(
  documentId: number,
  userId: number,
  role: MemberRole,
): Promise<Result<null>> {
  const response = await apiFetch(`/documents/${documentId}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  return response.ok ? { ok: true, data: null } : failure(response);
}

export async function removeMember(documentId: number, userId: number): Promise<Result<null>> {
  const response = await apiFetch(`/documents/${documentId}/members/${userId}`, {
    method: 'DELETE',
  });
  return response.ok ? { ok: true, data: null } : failure(response);
}

export async function acceptShareLink(token: string): Promise<Result<AcceptResult>> {
  const response = await postJson('/share-links/accept', { token });
  if (!response.ok) return failure(response);

  const body = await readJson<AcceptResult>(response);
  return body ? { ok: true, data: body } : { ok: false, code: 'INTERNAL_ERROR' };
}
