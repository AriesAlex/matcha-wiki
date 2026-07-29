import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface FilterEntry {
  namespace: string
  path: string
}

interface FixManifest {
  fixes: Array<{
    id: string
    files: string[]
    removedFiles?: string[]
  }>
}

const rootDir = resolve(import.meta.dirname, '..')
const packDir = resolve(rootDir, 'pack')

function walk(directory: string): string[] {
  return readdirSync(directory)
    .flatMap(name => {
      const path = resolve(directory, name)
      return statSync(path).isDirectory() ? walk(path) : [path]
    })
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

describe('corrected Matcha pack', () => {
  it('parses every JSON and MCMETA source', () => {
    const files = walk(packDir)
      .filter(path => ['.json', '.mcmeta'].includes(extname(path)))

    expect(files.length).toBeGreaterThan(3_000)
    for (const path of files) {
      expect(() => readJson(path), relative(rootDir, path)).not.toThrow()
    }
  })

  it('has a normalized and intentional vanilla recipe filter', () => {
    const metadata = readJson<{
      filter: { block: FilterEntry[] }
    }>(resolve(packDir, 'pack.mcmeta'))
    const entries = metadata.filter.block
    const keys = entries.map(entry => `${entry.namespace}:${entry.path}`)
    const recipePaths = entries
      .filter(entry => entry.path.startsWith('recipe/'))
      .map(entry => entry.path)

    expect(new Set(keys).size).toBe(keys.length)
    expect(entries).toHaveLength(319)
    expect(recipePaths).toHaveLength(314)
    expect(recipePaths).toContain('recipe/nether_brick.json')
    expect(recipePaths).not.toContain('recipe/turtle_shell.json')
  })

  it('keeps recycling recipes separate from vanilla raw-ore blasting', () => {
    for (const metal of ['copper', 'iron', 'gold']) {
      const recipe = readJson<{ ingredient: string[] }>(
        resolve(packDir, 'data', 'blasting', 'recipe', `${metal}_ingot_from_blasting_${metal}_materials.json`)
      )
      expect(recipe.ingredient).not.toContain(`minecraft:raw_${metal}`)
    }

    expect(existsSync(resolve(packDir, 'data', 'crafting', 'recipe', 'fire_starter.json'))).toBe(true)
    expect(existsSync(resolve(packDir, 'data', 'crafting', 'recipe', 'flint_and_steel.json'))).toBe(false)
  })

  it('keeps every public fix-registry path honest', () => {
    const manifestDir = resolve(rootDir, 'wiki-data', 'fixes')

    for (const path of walk(manifestDir).filter(file => extname(file) === '.json')) {
      const manifest = readJson<FixManifest>(path)
      const ids = new Set<string>()

      for (const fix of manifest.fixes) {
        expect(ids.has(fix.id), `${relative(rootDir, path)}: ${fix.id}`).toBe(false)
        ids.add(fix.id)

        for (const file of fix.files) {
          expect(existsSync(resolve(rootDir, file)), `${fix.id}: ${file}`).toBe(true)
        }
        for (const file of fix.removedFiles ?? []) {
          expect(existsSync(resolve(rootDir, file)), `${fix.id}: ${file}`).toBe(false)
        }
      }
    }
  })

  it('uses the exact case required by the foliage colormap reference', () => {
    const names = readdirSync(resolve(packDir, 'assets', 'minecraft', 'textures', 'colormap'))
    expect(names).toContain('dry_foliage.png')
    expect(names).not.toContain('Dry_foliage.png')
  })
})
