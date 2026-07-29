export function formatIdentifier(value: string): string {
  return value
    .replace(/^#/, '')
    .replace(/^[^:]+:/, '')
    .replaceAll('_', ' ')
    .replace(/\b\p{L}/gu, letter => letter.toUpperCase())
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} с`
  }

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder === 0 ? `${minutes} мин` : `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function stripMinecraftFormatting(value: string): string {
  return value.replace(/§[0-9a-fk-or]/gi, '')
}

export function recipePath(namespace: string, path: string): string {
  return `/recipes/${namespace}/${path}`
}
