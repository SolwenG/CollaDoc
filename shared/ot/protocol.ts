import type { Operation } from "./operation.ts";

export type DocumentRole = "OWNER" | "EDITOR" | "VIEWER";

export type JoinRequest = {
	documentId: number;
	revision?: number;
};

export type JoinResponse =
	| { ok: true; role: DocumentRole; revision: number; text: string }
	| {
			ok: true;
			role: DocumentRole;
			revision: number;
			missed: RemoteOperation[];
	  }
	| { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" | "TOO_OLD" };

export type OperationMessage = {
	documentId: number;
	revision: number;
	opId: string;
	operation: Operation;
};

export type AckMessage = {
	documentId: number;
	opId: string;
	revision: number;
};

export type RemoteOperation = {
	documentId: number;
	revision: number;
	opId: string;
	operation: Operation;
	authorId: number;
};

export type RejectReason = "FORBIDDEN" | "INVALID" | "TOO_OLD" | "NOT_JOINED";

export type RejectedMessage = {
	documentId: number;
	opId: string;
	reason: RejectReason;
};

export type ClosedMessage = {
	documentId: number;
	reason: "DELETED" | "ACCESS_REVOKED";
};

export interface ClientToServerEvents {
	"document:join": (
		request: JoinRequest,
		reply: (response: JoinResponse) => void,
	) => void;
	"document:leave": (request: { documentId: number }) => void;
	operation: (message: OperationMessage) => void;
}

export interface ServerToClientEvents {
	"operation:ack": (message: AckMessage) => void;
	"operation:remote": (message: RemoteOperation) => void;
	"operation:rejected": (message: RejectedMessage) => void;
	"document:closed": (message: ClosedMessage) => void;
}
