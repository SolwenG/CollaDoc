import { compose, isNoop, transform } from "./operation.ts";
import type { Operation } from "./operation.ts";

// What the client sends to the server
export type OutgoingOperation = {
  revision: number;
  opId: string;
  operation: Operation;
};

// An operation accepted by the server, as broadcast to every client
export type ServerOperation = {
  revision: number;
  opId: string;
  operation: Operation;
};

export type ReceiveResult = {
  // To apply to the local text (null when it was our own operation)
  toApply: Operation | null;
  // To send to the server right away
  toSend: OutgoingOperation | null;
};

// Client side of the protocol: at most one pending operation waiting for its
// acknowledgement, and a buffer of local edits composed while waiting.
// Pure logic: no DOM, no socket.
export class CollabClient {
  revision: number;
  private pending: { opId: string; operation: Operation } | null = null;
  private buffer: Operation | null = null;
  private readonly createOpId: () => string;

  constructor(revision: number, createOpId: () => string) {
    this.revision = revision;
    this.createOpId = createOpId;
  }

  get state(): "synchronized" | "awaitingAck" | "awaitingWithBuffer" {
    if (!this.pending) return "synchronized";
    return this.buffer ? "awaitingWithBuffer" : "awaitingAck";
  }

  // Local edit, already applied to the local text. Returns what to send, if anything.
  applyLocal(operation: Operation): OutgoingOperation | null {
    if (isNoop(operation)) return null;
    if (this.pending) {
      this.buffer = this.buffer ? compose(this.buffer, operation) : operation;
      return null;
    }
    this.pending = { opId: this.createOpId(), operation };
    return this.outgoing();
  }

  // Operation accepted by the server. It may be our own pending one, seen
  // again while catching up after a reconnection.
  receive(message: ServerOperation): ReceiveResult {
    if (this.pending && message.opId === this.pending.opId) {
      return {
        toApply: null,
        toSend: this.acknowledge(message.opId, message.revision),
      };
    }

    this.revision = message.revision;
    if (!this.pending) return { toApply: message.operation, toSend: null };

    const [pending, remote] = transform(
      this.pending.operation,
      message.operation,
    );
    this.pending = { ...this.pending, operation: pending };
    if (!this.buffer) return { toApply: remote, toSend: null };

    const [buffer, remoteAfterBuffer] = transform(this.buffer, remote);
    this.buffer = buffer;
    return { toApply: remoteAfterBuffer, toSend: null };
  }

  // Our pending operation got its revision. Returns the buffer to send next, if any.
  acknowledge(opId: string, revision: number): OutgoingOperation | null {
    if (!this.pending || this.pending.opId !== opId) return null;
    this.revision = revision;
    this.pending = null;
    if (!this.buffer) return null;
    this.pending = { opId: this.createOpId(), operation: this.buffer };
    this.buffer = null;
    return this.outgoing();
  }

  // The pending operation, rebased on the current revision: to send again after a reconnection
  outgoing(): OutgoingOperation | null {
    if (!this.pending) return null;
    return { revision: this.revision, ...this.pending };
  }
}
