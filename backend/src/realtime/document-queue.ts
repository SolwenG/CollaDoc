const lastTasks = new Map<number, Promise<unknown>>()

export function runInOrder<T>(
    documentId: number,
    task: () => Promise<T>
): Promise<T> {
    const previous = lastTasks.get(documentId) ?? Promise.resolve()
    // The new task only starts once the previous one is done (succeeded or failed)
    const current = previous.then(task, task)
    // It becomes the last in line; a failure must not block the next ones
    const tail = current.catch(() => {})
    lastTasks.set(documentId, tail)
    // Forget the document once its line is empty
    tail.then(() => {
        if (lastTasks.get(documentId) === tail) lastTasks.delete(documentId)
    })
    return current
}
