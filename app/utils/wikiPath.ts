export type WikiRequestStatus = 'idle' | 'pending' | 'success' | 'error'

export function normalizeWikiPath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

export function isMissingWikiPage(status: WikiRequestStatus, page: unknown): boolean {
  return status === 'success' && page === null
}
