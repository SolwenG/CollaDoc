import type { Server, Socket } from "socket.io";
import type {
	ClientToServerEvents,
	ServerToClientEvents,
} from "../../../shared/ot/index.ts";

type InterServerEvents = Record<string, never>;

export type SocketData = {
	userId: number;
	token: string;
	documentIds: Set<number>;
};

export type CollabServer = Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;

export type CollabSocket = Socket<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;

export function documentRoom(documentId: number): string {
	return `document:${documentId}`;
}

export function userRoom(userId: number): string {
	return `user:${userId}`;
}
