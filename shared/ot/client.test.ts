import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CollabClient } from "./client.ts";
import type { OutgoingOperation, ServerOperation } from "./client.ts";
import { OperationBuilder, apply, transform } from "./operation.ts";
import type { Operation } from "./operation.ts";

class FakeServer {
	text: string;
	history: ServerOperation[] = [];

	constructor(text: string) {
		this.text = text;
	}

	receive(message: OutgoingOperation): ServerOperation {
		let operation = message.operation;
		for (const seen of this.history.slice(message.revision)) {
			[operation] = transform(operation, seen.operation);
		}
		this.text = apply(this.text, operation);
		const accepted = {
			revision: this.history.length + 1,
			opId: message.opId,
			operation,
		};
		this.history.push(accepted);
		return accepted;
	}
}

class FakeUser {
	text: string;
	client: CollabClient;
	toServer: OutgoingOperation[] = [];
	fromServer: ServerOperation[] = [];

	constructor(name: string, text: string) {
		let counter = 0;
		this.text = text;
		this.client = new CollabClient(0, () => `${name}-${counter++}`);
	}

	edit(operation: Operation) {
		this.text = apply(this.text, operation);
		const outgoing = this.client.applyLocal(operation);
		if (outgoing) this.toServer.push(outgoing);
	}

	deliverOne() {
		const message = this.fromServer.shift();
		if (!message) return;
		const { toApply, toSend } = this.client.receive(message);
		if (toApply) this.text = apply(this.text, toApply);
		if (toSend) this.toServer.push(toSend);
	}
}

function editOn(
	text: string,
	position: number,
	size: number,
	insert: string,
): Operation {
	const at = text.length === 0 ? 0 : position % (text.length + 1);
	const deleted = Math.min(size, text.length - at);
	return new OperationBuilder()
		.retain(at)
		.delete(deleted)
		.insert(insert)
		.retain(text.length - at - deleted)
		.build();
}

const action = fc.record({
	user: fc.nat(2),
	kind: fc.constantFrom("edit", "send", "deliver"),
	position: fc.nat(40),
	size: fc.nat(3),
	insert: fc.string({ maxLength: 3 }),
});

describe("CollabClient", () => {
	it("sends one operation at a time and buffers the rest", () => {
		const client = new CollabClient(0, () => "op");
		expect(client.applyLocal([{ insert: "a" }])).not.toBeNull();
		expect(client.applyLocal([{ retain: 1 }, { insert: "b" }])).toBeNull();
		expect(client.state).toBe("awaitingWithBuffer");

		const next = client.acknowledge("op", 1);
		expect(next).toEqual({
			revision: 1,
			opId: "op",
			operation: [{ retain: 1 }, { insert: "b" }],
		});
		expect(client.state).toBe("awaitingAck");
	});

	it("treats its own operation seen while catching up as an acknowledgement", () => {
		const client = new CollabClient(0, () => "op");
		client.applyLocal([{ insert: "a" }]);
		const { toApply } = client.receive({
			revision: 1,
			opId: "op",
			operation: [{ insert: "a" }],
		});
		expect(toApply).toBeNull();
		expect(client.state).toBe("synchronized");
		expect(client.revision).toBe(1);
	});

	it("makes every user converge to the server's text", () => {
		fc.assert(
			fc.property(
				fc.string({ maxLength: 10 }),
				fc.array(action, { maxLength: 60 }),
				(initial, actions) => {
					const server = new FakeServer(initial);
					const users = ["alice", "bob", "carol"].map(
						(name) => new FakeUser(name, initial),
					);

					const sendOne = (user: FakeUser) => {
						const message = user.toServer.shift();
						if (!message) return;
						const accepted = server.receive(message);
						for (const other of users) other.fromServer.push(accepted);
					};

					for (const { user: index, kind, position, size, insert } of actions) {
						const user = users[index]!;
						if (kind === "edit")
							user.edit(editOn(user.text, position, size, insert));
						else if (kind === "send") sendOne(user);
						else user.deliverOne();
					}

					// Let the network drain
					while (
						users.some(
							(user) => user.toServer.length > 0 || user.fromServer.length > 0,
						)
					) {
						for (const user of users) {
							sendOne(user);
							user.deliverOne();
						}
					}

					for (const user of users) {
						expect(user.text).toBe(server.text);
						expect(user.client.state).toBe("synchronized");
					}
				},
			),
			{ numRuns: 1000 },
		);
	});
});
