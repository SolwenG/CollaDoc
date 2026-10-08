import type {
	JoinResponse,
	Operation,
	OperationMessage,
	RejectReason,
} from "../../../shared/ot/index.ts";
import {
	apply,
	baseLength,
	targetLength,
	transform,
} from "../../../shared/ot/index.ts";
import {
	MAX_DOCUMENT_LENGTH,
	joinSchema,
	leaveSchema,
	operationMessageSchema,
} from "./collaboration.schema.ts";
import type { JournalEntry } from "./collaboration.service.ts";
import {
	findDocumentRole,
	findOperationByOpId,
	findOperationsAfter,
	insertOperation,
} from "./collaboration.service.ts";
import { runInOrder } from "./document-queue.ts";
import {
	SNAPSHOT_EVERY_OPERATIONS,
	forgetDocument,
	getOpenDocument,
	loadDocument,
	writeSnapshot,
} from "./open-documents.ts";
import type { CollabSocket } from "./socket.types.ts";
import { documentRoom } from "./socket.types.ts";

function isComplete(
	entries: JournalEntry[],
	from: number,
	to: number,
): boolean {
	return (
		entries.length === to - from &&
		(entries.length === 0 || entries[0]!.revision === from + 1)
	);
}

async function joinDocument(
	socket: CollabSocket,
	documentId: number,
	knownRevision: number | undefined,
): Promise<JoinResponse> {
	const role = await findDocumentRole(documentId, socket.data.userId);
	if (!role) return { ok: false, reason: "NOT_FOUND" };

	return runInOrder(documentId, async () => {
		const document = await loadDocument(documentId);
		if (!document) return { ok: false, reason: "NOT_FOUND" } as const;

		let response: JoinResponse;
		if (knownRevision === undefined || knownRevision > document.revision) {
			response = {
				ok: true,
				role,
				revision: document.revision,
				text: document.text,
			};
		} else {
			const missed = await findOperationsAfter(documentId, knownRevision);
			if (!isComplete(missed, knownRevision, document.revision)) {
				if (document.sockets.size === 0) forgetDocument(documentId);
				return { ok: false, reason: "TOO_OLD" } as const;
			}
			response = {
				ok: true,
				role,
				revision: document.revision,
				missed: missed.map((entry) => ({ documentId, ...entry })),
			};
		}

		document.sockets.add(socket.id);
		socket.data.documentIds.add(documentId);
		await socket.join(documentRoom(documentId));
		return response;
	});
}

// Removes the socket from the document; the last one out writes the snapshot
export function leaveDocument(
	socketId: string,
	documentId: number,
): Promise<void> {
	return runInOrder(documentId, async () => {
		const document = getOpenDocument(documentId);
		if (!document || !document.sockets.delete(socketId)) return;
		if (document.sockets.size > 0) return;
		try {
			await writeSnapshot(document);
		} finally {
			forgetDocument(documentId);
		}
	});
}

async function handleOperation(
	socket: CollabSocket,
	message: OperationMessage,
): Promise<RejectReason | null> {
	const { documentId, revision, opId } = message;
	const userId = socket.data.userId;

	const document = getOpenDocument(documentId);
	if (!document || !document.sockets.has(socket.id)) return "NOT_JOINED";

	const existing = await findOperationByOpId(opId);
	if (existing) {
		if (existing.documentId !== documentId) return "INVALID";
		socket.emit("operation:ack", {
			documentId,
			opId,
			revision: existing.revision,
		});
		return null;
	}

	const role = await findDocumentRole(documentId, userId);
	if (role !== "OWNER" && role !== "EDITOR") return "FORBIDDEN";
	if (revision > document.revision) return "INVALID";

	let operation: Operation = message.operation;
	if (revision < document.revision) {
		const missed = await findOperationsAfter(documentId, revision);
		if (!isComplete(missed, revision, document.revision)) return "TOO_OLD";
		try {
			for (const entry of missed)
				[operation] = transform(operation, entry.operation);
		} catch {
			return "INVALID";
		}
	}
	if (baseLength(operation) !== document.text.length) return "INVALID";
	if (targetLength(operation) > MAX_DOCUMENT_LENGTH) return "INVALID";

	const entry: JournalEntry = {
		revision: document.revision + 1,
		opId,
		operation,
		authorId: userId,
	};
	await insertOperation(documentId, entry);
	document.text = apply(document.text, operation);
	document.revision = entry.revision;
	document.lastAuthorId = userId;

	socket.emit("operation:ack", { documentId, opId, revision: entry.revision });
	socket
		.to(documentRoom(documentId))
		.emit("operation:remote", { documentId, ...entry });

	if (
		document.revision - document.contentRevision >=
		SNAPSHOT_EVERY_OPERATIONS
	) {
		await writeSnapshot(document);
	}
	return null;
}

function rejectionTarget(message: unknown): {
	documentId: number;
	opId: string;
} {
	const { documentId, opId } =
		typeof message === "object" && message !== null
			? (message as Record<string, unknown>)
			: {};
	return {
		documentId: typeof documentId === "number" ? documentId : 0,
		opId: typeof opId === "string" ? opId : "",
	};
}

export function registerCollaborationHandlers(socket: CollabSocket): void {
	socket.on("document:join", async (request, reply) => {
		if (typeof reply !== "function") return;
		const parsed = joinSchema.safeParse(request);
		if (!parsed.success) return reply({ ok: false, reason: "NOT_FOUND" });
		try {
			reply(
				await joinDocument(
					socket,
					parsed.data.documentId,
					parsed.data.revision,
				),
			);
		} catch (error) {
			console.error(error);
			reply({ ok: false, reason: "NOT_FOUND" });
		}
	});

	socket.on("operation", async (message) => {
		const parsed = operationMessageSchema.safeParse(message);
		if (!parsed.success) {
			socket.emit("operation:rejected", {
				...rejectionTarget(message),
				reason: "INVALID",
			});
			return;
		}
		const { documentId, opId } = parsed.data;
		let reason: RejectReason | null;
		try {
			reason = await runInOrder(documentId, () =>
				handleOperation(socket, parsed.data),
			);
		} catch (error) {
			console.error(error);
			reason = "INVALID";
		}
		if (reason) socket.emit("operation:rejected", { documentId, opId, reason });
	});

	socket.on("document:leave", async (request) => {
		const parsed = leaveSchema.safeParse(request);
		if (!parsed.success) return;
		const { documentId } = parsed.data;
		socket.data.documentIds.delete(documentId);
		await socket.leave(documentRoom(documentId));
		await leaveDocument(socket.id, documentId).catch(console.error);
	});

	socket.on("disconnect", async () => {
		for (const documentId of socket.data.documentIds) {
			await leaveDocument(socket.id, documentId).catch(console.error);
		}
	});
}
