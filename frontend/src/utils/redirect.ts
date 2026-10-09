// The redirect query can be forged: only follow paths inside the app.
// "//evil.com" and "/\evil.com" are read by browsers as another site.
export function safeRedirect(value: unknown): string {
    if (typeof value !== 'string') return '/'
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
    return value
}
