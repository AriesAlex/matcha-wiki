import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  COLOR_THEME_BOOTSTRAP_SCRIPT,
  COLOR_THEME_STORAGE_KEY,
  DARK_THEME_MEDIA_QUERY,
  resolveColorTheme
} from '../app/utils/colorTheme'

interface BootstrapOptions {
  prefersDark: boolean
  savedTheme?: string | null
  storageError?: boolean
}

function runBootstrap(options: BootstrapOptions): {
  dataset: Record<string, string>
  requestedKeys: string[]
  requestedQueries: string[]
  storedValues: Array<[string, string]>
} {
  const dataset: Record<string, string> = {}
  const requestedKeys: string[] = []
  const requestedQueries: string[] = []
  const storedValues: Array<[string, string]> = []

  runInNewContext(COLOR_THEME_BOOTSTRAP_SCRIPT, {
    document: {
      documentElement: {
        dataset
      }
    },
    localStorage: {
      getItem(key: string) {
        requestedKeys.push(key)
        if (options.storageError) {
          throw new Error('Storage is blocked')
        }
        return options.savedTheme ?? null
      },
      setItem(key: string, value: string) {
        storedValues.push([key, value])
      }
    },
    matchMedia(query: string) {
      requestedQueries.push(query)
      return { matches: options.prefersDark }
    }
  })

  return {
    dataset,
    requestedKeys,
    requestedQueries,
    storedValues
  }
}

describe('color theme bootstrap', () => {
  it('resolves only valid manual overrides', () => {
    expect(resolveColorTheme('light', true)).toBe('light')
    expect(resolveColorTheme('dark', false)).toBe('dark')
    expect(resolveColorTheme('invalid', true)).toBe('dark')
    expect(resolveColorTheme(null, false)).toBe('light')
  })

  it('applies the system preference before the app starts', () => {
    const result = runBootstrap({ prefersDark: true })

    expect(result.dataset.theme).toBe('dark')
    expect(result.requestedKeys).toEqual([COLOR_THEME_STORAGE_KEY])
    expect(result.requestedQueries).toEqual([DARK_THEME_MEDIA_QUERY])
    expect(result.storedValues).toEqual([])
  })

  it('keeps a saved manual override instead of the system preference', () => {
    const result = runBootstrap({
      prefersDark: true,
      savedTheme: 'light'
    })

    expect(result.dataset.theme).toBe('light')
    expect(result.requestedQueries).toEqual([])
  })

  it('falls back to the system preference when storage is unavailable', () => {
    const result = runBootstrap({
      prefersDark: true,
      storageError: true
    })

    expect(result.dataset.theme).toBe('dark')
    expect(result.requestedQueries).toEqual([DARK_THEME_MEDIA_QUERY])
  })
})

describe('display font coverage', () => {
  it('loads Tiny5 with both Cyrillic and Latin subsets', () => {
    const config = readFileSync(resolve(import.meta.dirname, '..', 'nuxt.config.ts'), 'utf8')

    expect(config).toContain("'@fontsource/tiny5/400.css'")
    expect(config).not.toContain("'@fontsource/tiny5/cyrillic-400.css'")
  })
})
