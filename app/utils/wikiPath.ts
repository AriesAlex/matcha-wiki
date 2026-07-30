export type WikiRequestStatus = 'idle' | 'pending' | 'success' | 'error'

export function normalizeWikiPath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

export function normalizeRouteParam(value: unknown): string {
  const parts = Array.isArray(value) ? value : [value]
  return parts
    .flatMap(part => String(part ?? '').split('/'))
    .filter(Boolean)
    .join('/')
}

export function isMissingWikiPage(status: WikiRequestStatus, page: unknown): boolean {
  return status === 'success' && page === null
}
