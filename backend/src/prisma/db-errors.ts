// Postgres error code raised when a unique constraint or index rejects a row
const UNIQUE_VIOLATION = '23505'

export function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'sqlState' in error &&
        error.sqlState === UNIQUE_VIOLATION
    )
}
