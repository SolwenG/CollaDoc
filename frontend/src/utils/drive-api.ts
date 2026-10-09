import { API_PREFIX, apiFetch, readApiError, readJson } from '@/utils/api';

export interface FolderView {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentView {
  id: number;
  name: string;
  kind: 'TEXT' | 'FILE';
  folderId: number | null;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: { id: number; displayName: string } | null;
}

export interface FolderContents {
  folder: FolderView | null;
  ancestors: { id: number; name: string }[];
  folders: FolderView[];
  documents: DocumentView[];
}

// Either the body of a successful response, or the message to show to the user
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function toResult<T>(response: Response): Promise<ApiResult<T>> {
  if (response.ok) {
    return { ok: true, data: (await readJson<T>(response)) as T };
  }
  const error = await readApiError(response);
  return { ok: false, message: error?.message ?? 'Erreur inattendue' };
}

async function send<T>(path: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await apiFetch(path, {
      method,
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    });
    return await toResult<T>(response);
  } catch {
    return { ok: false, message: 'Serveur injoignable' };
  }
}

async function sendFile<T>(
  path: string,
  method: string,
  file: File,
  fields: Record<string, string> = {},
): Promise<ApiResult<T>> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('file', file);
  try {
    return await toResult<T>(await apiFetch(path, { method, body: form }));
  } catch {
    return { ok: false, message: 'Serveur injoignable' };
  }
}

export function fetchFolderContents(folderId: number | null) {
  return send<FolderContents>(folderId === null ? '/folders/root' : `/folders/${folderId}`, 'GET');
}

export function createFolder(name: string, parentId: number | null) {
  return send<{ folder: FolderView }>('/folders', 'POST', { name, parentId });
}

export function updateFolder(id: number, changes: { name?: string; parentId?: number | null }) {
  return send<{ folder: FolderView }>(`/folders/${id}`, 'PATCH', changes);
}

export function deleteFolder(id: number) {
  return send<void>(`/folders/${id}`, 'DELETE');
}

export function createTextDocument(name: string, folderId: number | null) {
  return send<{ document: DocumentView }>('/documents', 'POST', { name, folderId });
}

export function uploadFile(file: File, folderId: number | null) {
  return sendFile<{ document: DocumentView }>(
    '/documents/files',
    'POST',
    file,
    folderId === null ? {} : { folderId: String(folderId) },
  );
}

export function replaceFile(id: number, file: File) {
  return sendFile<{ document: DocumentView }>(`/documents/${id}/file`, 'PUT', file);
}

export function updateDocument(id: number, changes: { name?: string; folderId?: number | null }) {
  return send<{ document: DocumentView }>(`/documents/${id}`, 'PATCH', changes);
}

export function deleteDocument(id: number) {
  return send<void>(`/documents/${id}`, 'DELETE');
}

export function fileUrl(id: number, download = false) {
  return `${API_PREFIX}/documents/${id}/file${download ? '?download=1' : ''}`;
}
