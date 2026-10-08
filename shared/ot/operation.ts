// Operations on plain text, shared by the browser and the realtime server.
// Positions and lengths are UTF-16 code units, like String.length.

export type Retain = { retain: number };
export type Insert = { insert: string };
export type Delete = { delete: number };
export type Step = Retain | Insert | Delete;

// Walks the whole base text from left to right: retained + deleted characters
// always add up to the length of the text it applies to
export type Operation = Step[];

export function isRetain(step: Step): step is Retain {
  return "retain" in step;
}

export function isInsert(step: Step): step is Insert {
  return "insert" in step;
}

export function isDelete(step: Step): step is Delete {
  return "delete" in step;
}

// Builds a normalized operation: no empty step, no two consecutive steps of
// the same kind, and an insert always placed before an adjacent delete
export class OperationBuilder {
  private readonly steps: Step[] = [];

  retain(count: number): this {
    if (count <= 0) return this;
    const last = this.steps.at(-1);
    if (last && isRetain(last)) {
      this.steps[this.steps.length - 1] = { retain: last.retain + count };
    } else {
      this.steps.push({ retain: count });
    }
    return this;
  }

  insert(text: string): this {
    if (text === "") return this;
    const last = this.steps.at(-1);
    if (last && isInsert(last)) {
      this.steps[this.steps.length - 1] = { insert: last.insert + text };
      return this;
    }
    if (last && isDelete(last)) {
      // Deleting then inserting is the same as inserting then deleting
      const beforeLast = this.steps.at(-2);
      if (beforeLast && isInsert(beforeLast)) {
        this.steps[this.steps.length - 2] = {
          insert: beforeLast.insert + text,
        };
      } else {
        this.steps.splice(this.steps.length - 1, 0, { insert: text });
      }
      return this;
    }
    this.steps.push({ insert: text });
    return this;
  }

  delete(count: number): this {
    if (count <= 0) return this;
    const last = this.steps.at(-1);
    if (last && isDelete(last)) {
      this.steps[this.steps.length - 1] = { delete: last.delete + count };
    } else {
      this.steps.push({ delete: count });
    }
    return this;
  }

  build(): Operation {
    return [...this.steps];
  }
}

// Length of the text the operation applies to
export function baseLength(operation: Operation): number {
  let length = 0;
  for (const step of operation) {
    if (isRetain(step)) length += step.retain;
    else if (isDelete(step)) length += step.delete;
  }
  return length;
}

// Length of the text the operation produces
export function targetLength(operation: Operation): number {
  let length = 0;
  for (const step of operation) {
    if (isRetain(step)) length += step.retain;
    else if (isInsert(step)) length += step.insert.length;
  }
  return length;
}

export function isNoop(operation: Operation): boolean {
  return operation.every(isRetain);
}

export function apply(text: string, operation: Operation): string {
  if (baseLength(operation) !== text.length) {
    throw new Error("Operation base length does not match the text length");
  }
  const parts: string[] = [];
  let index = 0;
  for (const step of operation) {
    if (isRetain(step)) {
      parts.push(text.slice(index, index + step.retain));
      index += step.retain;
    } else if (isInsert(step)) {
      parts.push(step.insert);
    } else {
      index += step.delete;
    }
  }
  return parts.join("");
}

// Reads an operation step by step, splitting a step when only part of it is consumed
class StepReader {
  private readonly operation: Operation;
  private index = 0;
  private current: Step | undefined;

  constructor(operation: Operation) {
    this.operation = operation;
    this.current = operation[0];
  }

  peek(): Step | undefined {
    return this.current;
  }

  // Length of the current step, counted in characters of the text it walks
  peekLength(): number {
    const step = this.current;
    if (!step) return Infinity;
    if (isRetain(step)) return step.retain;
    if (isDelete(step)) return step.delete;
    return step.insert.length;
  }

  // Consumes `length` characters of the current step (all of it by default)
  take(length = Infinity): Step | undefined {
    const step = this.current;
    if (!step) return undefined;
    const stepLength = this.peekLength();
    if (length >= stepLength) {
      this.index += 1;
      this.current = this.operation[this.index];
      return step;
    }
    if (isRetain(step)) {
      this.current = { retain: step.retain - length };
      return { retain: length };
    }
    if (isDelete(step)) {
      this.current = { delete: step.delete - length };
      return { delete: length };
    }
    this.current = { insert: step.insert.slice(length) };
    return { insert: step.insert.slice(0, length) };
  }
}

// Merges `first` then `second` (applied to the result of `first`) into one operation
export function compose(first: Operation, second: Operation): Operation {
  if (targetLength(first) !== baseLength(second)) {
    throw new Error(
      "Cannot compose: the second operation does not apply to the first one's result",
    );
  }
  const result = new OperationBuilder();
  const a = new StepReader(first);
  const b = new StepReader(second);

  while (a.peek() || b.peek()) {
    const stepA = a.peek();
    const stepB = b.peek();

    // Characters deleted by `first` are never seen by `second`
    if (stepA && isDelete(stepA)) {
      result.delete(stepA.delete);
      a.take();
      continue;
    }
    // Characters inserted by `second` do not exist in `first`
    if (stepB && isInsert(stepB)) {
      result.insert(stepB.insert);
      b.take();
      continue;
    }
    if (!stepA || !stepB)
      throw new Error("Cannot compose: operations have different lengths");

    const length = Math.min(a.peekLength(), b.peekLength());
    const partA = a.take(length)!;
    const partB = b.take(length)!;

    if (isRetain(partA) && isRetain(partB)) result.retain(length);
    else if (isRetain(partA) && isDelete(partB)) result.delete(length);
    else if (isInsert(partA) && isRetain(partB)) result.insert(partA.insert);
    // insert then delete of the same characters: nothing left
  }
  return result.build();
}

// `client` and `server` were made concurrently on the same text. Returns
// [client', server']: client' applies after server, server' applies after
// client, and both orders lead to the same text. When both insert at the same
// position, the server's text goes first.
export function transform(
  client: Operation,
  server: Operation,
): [Operation, Operation] {
  if (baseLength(client) !== baseLength(server)) {
    throw new Error(
      "Cannot transform: operations do not apply to the same text",
    );
  }
  const clientPrime = new OperationBuilder();
  const serverPrime = new OperationBuilder();
  const a = new StepReader(client);
  const b = new StepReader(server);

  while (a.peek() || b.peek()) {
    const stepA = a.peek();
    const stepB = b.peek();

    if (stepB && isInsert(stepB)) {
      clientPrime.retain(stepB.insert.length);
      serverPrime.insert(stepB.insert);
      b.take();
      continue;
    }
    if (stepA && isInsert(stepA)) {
      clientPrime.insert(stepA.insert);
      serverPrime.retain(stepA.insert.length);
      a.take();
      continue;
    }
    if (!stepA || !stepB)
      throw new Error("Cannot transform: operations have different lengths");

    const length = Math.min(a.peekLength(), b.peekLength());
    const partA = a.take(length)!;
    const partB = b.take(length)!;

    if (isRetain(partA) && isRetain(partB)) {
      clientPrime.retain(length);
      serverPrime.retain(length);
    } else if (isDelete(partA) && isRetain(partB)) {
      clientPrime.delete(length);
    } else if (isRetain(partA) && isDelete(partB)) {
      serverPrime.delete(length);
    }
    // Both deleted the same characters: nothing left to do on either side
  }
  return [clientPrime.build(), serverPrime.build()];
}

// New position of a caret after the operation is applied. Text inserted
// exactly at the caret pushes it to the right.
export function transformIndex(operation: Operation, index: number): number {
  let result = index;
  let position = 0;
  for (const step of operation) {
    if (position > index) break;
    if (isRetain(step)) {
      position += step.retain;
    } else if (isInsert(step)) {
      result += step.insert.length;
    } else {
      result -= Math.min(step.delete, index - position);
      position += step.delete;
    }
  }
  return result;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

// Operation turning `before` into `after`: common prefix and suffix are kept,
// the middle is replaced. Never splits a surrogate pair (emoji).
export function diff(before: string, after: string): Operation {
  const maxPrefix = Math.min(before.length, after.length);
  let prefix = 0;
  while (
    prefix < maxPrefix &&
    before.charCodeAt(prefix) === after.charCodeAt(prefix)
  )
    prefix++;
  if (prefix > 0 && isHighSurrogate(before.charCodeAt(prefix - 1))) prefix--;

  const maxSuffix = maxPrefix - prefix;
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    before.charCodeAt(before.length - 1 - suffix) ===
      after.charCodeAt(after.length - 1 - suffix)
  ) {
    suffix++;
  }
  if (suffix > 0 && isLowSurrogate(before.charCodeAt(before.length - suffix)))
    suffix--;

  return new OperationBuilder()
    .retain(prefix)
    .delete(before.length - prefix - suffix)
    .insert(after.slice(prefix, after.length - suffix))
    .retain(suffix)
    .build();
}
