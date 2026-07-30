import { parse } from 'minecraft-motd-util/dist/parse'

export interface MinecraftTextSegment {
  text: string
  color: string
  bold?: boolean
  italics?: boolean
  underline?: boolean
  strikethrough?: boolean
  obfuscated?: boolean
}

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
  return parseMinecraftFormatting(value).map(segment => segment.text).join('')
}

export function parseMinecraftFormatting(value: string): MinecraftTextSegment[] {
  return parse(value).map(segment => ({ ...segment }))
}

export function recipePath(namespace: string, path: string): string {
  return `/recipes/${namespace}/${path}`
}
