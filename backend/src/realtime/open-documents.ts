import { apply } from "../../../shared/ot/index.ts";
import {
  findOperationsAfter,
  findSnapshot,
  saveSnapshot,
} from "./collaboration.service.ts";

// A snapshot is written after this many operations, even if users stay connected
export const SNAPSHOT_EVERY_OPERATIONS = 50;

// A document at least one user is editing, kept in memory.
// Only read or changed inside runInOrder for its id.
export type OpenDocument = {
  id: number;
  text: string;
  revision: number;
  // Revision of the snapshot stored in the database
  contentRevision: number;
  // Author of the last operation, saved as lastModifiedById with the snapshot
  lastAuthorId: number | null;
  // Ids of the sockets that joined the document
  sockets: Set<string>;
};

const openDocuments = new Map<number, OpenDocument>();

export function getOpenDocument(documentId: number): OpenDocument | undefined {
  return openDocuments.get(documentId);
}

export function listOpenDocuments(): OpenDocument[] {
  return [...openDocuments.values()];
}

export function forgetDocument(documentId: number): void {
  openDocuments.delete(documentId);
}

// Snapshot + journal entries written after it: the exact text, even after a crash
export async function loadDocument(
  documentId: number,
): Promise<OpenDocument | null> {
  const existing = openDocuments.get(documentId);
  if (existing) return existing;

  const snapshot = await findSnapshot(documentId);
  if (!snapshot) return null;

  const entries = await findOperationsAfter(
    documentId,
    snapshot.contentRevision,
  );
  let text = snapshot.content ?? "";
  for (const entry of entries) text = apply(text, entry.operation);

  const last = entries.at(-1);
  const document: OpenDocument = {
    id: documentId,
    text,
    revision: last?.revision ?? snapshot.contentRevision,
    contentRevision: snapshot.contentRevision,
    lastAuthorId: last?.authorId ?? null,
    sockets: new Set(),
  };
  openDocuments.set(documentId, document);
  return document;
}

export async function writeSnapshot(document: OpenDocument): Promise<void> {
  if (document.revision === document.contentRevision) return;
  const revision = document.revision;
  await saveSnapshot({
    documentId: document.id,
    content: document.text,
    contentRevision: revision,
    lastModifiedById: document.lastAuthorId,
  });
  document.contentRevision = revision;
}
