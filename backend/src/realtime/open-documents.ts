import { apply } from "../../../shared/ot/index.ts";
import {
	findOperationsAfter,
	findSnapshot,
	saveSnapshot,
} from "./collaboration.service.ts";

// A snapshot is written after this many operations, even if users stay connected
export const SNAPSHOT_EVERY_OPERATIONS = 50;

export type OpenDocument = {
	id: number;
	text: string;
	revision: number;
	contentRevision: number;
	lastAuthorId: number | null;
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
