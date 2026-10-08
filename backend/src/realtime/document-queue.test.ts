import { describe, expect, it } from "vitest";
import { runInOrder } from "./document-queue.ts";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("runInOrder", () => {
  it("runs the tasks of a document one after the other", async () => {
    const events: string[] = [];
    const task = (name: string, ms: number) => async () => {
      events.push(`${name} start`);
      await wait(ms);
      events.push(`${name} end`);
    };

    await Promise.all([
      runInOrder(1, task("a", 20)),
      runInOrder(1, task("b", 0)),
    ]);

    expect(events).toEqual(["a start", "a end", "b start", "b end"]);
  });

  it("does not make two documents wait for each other", async () => {
    const events: string[] = [];
    const slow = runInOrder(1, async () => {
      await wait(20);
      events.push("document 1");
    });
    const fast = runInOrder(2, async () => {
      events.push("document 2");
    });

    await Promise.all([slow, fast]);

    expect(events).toEqual(["document 2", "document 1"]);
  });

  it("keeps going after a failed task", async () => {
    const failing = runInOrder(1, async () => {
      throw new Error("boom");
    });
    const next = runInOrder(1, async () => "done");

    await expect(failing).rejects.toThrow("boom");
    await expect(next).resolves.toBe("done");
  });
});
