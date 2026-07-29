import { resolve } from 'node:path'

interface FilterEntry {
  namespace: string
  path: string
}

interface PackMetadata {
  pack: Record<string, unknown>
  filter: {
    block: FilterEntry[]
  }
}

const metadataPath = resolve(import.meta.dir, '..', 'pack', 'pack.mcmeta')
const metadata = await Bun.file(metadataPath).json() as PackMetadata
const originalEntries = metadata.filter.block
const seen = new Set<string>()
const normalizedEntries: FilterEntry[] = []

for (const entry of originalEntries) {
  if (entry.namespace === 'minecraft' && entry.path === 'recipe/turtle_shell.json') {
    continue
  }

  const key = `${entry.namespace}:${entry.path}`
  if (seen.has(key)) {
    continue
  }

  seen.add(key)
  normalizedEntries.push(entry)
}

const netherBrick = {
  namespace: 'minecraft',
  path: 'recipe/nether_brick.json'
}
const netherBrickKey = `${netherBrick.namespace}:${netherBrick.path}`

if (!seen.has(netherBrickKey)) {
  normalizedEntries.push(netherBrick)
}

const recipeEntries = normalizedEntries.filter(entry => entry.path.startsWith('recipe/'))
const expectedRecipeEntries = 314
const expectedTotalEntries = 319

if (
  recipeEntries.length !== expectedRecipeEntries
  || normalizedEntries.length !== expectedTotalEntries
) {
  throw new Error(
    `Неожиданный фильтр: ${recipeEntries.length} recipe и ${normalizedEntries.length} всего; `
    + `ожидалось ${expectedRecipeEntries} и ${expectedTotalEntries}`
  )
}

const normalized = `${JSON.stringify({
  ...metadata,
  filter: {
    ...metadata.filter,
    block: normalizedEntries
  }
}, null, 2)}\n`
const current = await Bun.file(metadataPath).text()

if (process.argv.includes('--check')) {
  if (current !== normalized) {
    throw new Error('pack.mcmeta не нормализован: запустите bun run pack:normalize')
  }
} else if (current !== normalized) {
  await Bun.write(metadataPath, normalized)
  console.log(
    `Фильтр нормализован: ${originalEntries.length} → ${normalizedEntries.length} записей`
  )
}
