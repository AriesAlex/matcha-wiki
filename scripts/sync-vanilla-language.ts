import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

interface VersionManifest {
  versions: Array<{
    id: string
    url: string
  }>
}

interface VersionMetadata {
  assetIndex: {
    id: string
    url: string
  }
}

interface AssetIndex {
  objects: Record<string, {
    hash: string
    size: number
  }>
}

interface VanillaLanguageSnapshot {
  minecraftVersion: string
  assetIndex: string
  objectSha1: string
  sourceUrl: string
  entries: Record<string, string>
}

const minecraftVersion = '26.2'
const expectedAssetIndex = '32'
const expectedLanguageSha1 = '44f2a01ff488842431bb3a9f33c0d3d2dc8e9a2f'
const languageKey = 'minecraft/lang/ru_ru.json'
const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const outputPath = resolve(import.meta.dir, '../wiki-data/vanilla-ru-26.2.json')
const checkOnly = process.argv.includes('--check')

await main()

async function main(): Promise<void> {
  const manifest = await fetchJson<VersionManifest>(manifestUrl)
  const version = manifest.versions.find(entry => entry.id === minecraftVersion)

  if (!version) {
    throw new Error(`Minecraft ${minecraftVersion} отсутствует в официальном manifest`)
  }

  const metadata = await fetchJson<VersionMetadata>(version.url)
  if (metadata.assetIndex.id !== expectedAssetIndex) {
    throw new Error(
      `Для Minecraft ${minecraftVersion} ожидался asset index ${expectedAssetIndex}, `
      + `получен ${metadata.assetIndex.id}`
    )
  }

  const assetIndex = await fetchJson<AssetIndex>(metadata.assetIndex.url)
  const language = assetIndex.objects[languageKey]
  if (!language || language.hash !== expectedLanguageSha1) {
    throw new Error(
      `Ожидался SHA-1 ${expectedLanguageSha1} для ${languageKey}, `
      + `получен ${language?.hash ?? 'отсутствует'}`
    )
  }

  const sourceUrl = `https://resources.download.minecraft.net/${language.hash.slice(0, 2)}/${language.hash}`
  const source = await fetchBytes(sourceUrl)
  const actualSha1 = createHash('sha1').update(source).digest('hex')
  if (actualSha1 !== expectedLanguageSha1) {
    throw new Error(`SHA-1 скачанного ru_ru.json не совпал: ${actualSha1}`)
  }

  const sourceEntries = JSON.parse(source.toString('utf8')) as Record<string, string>
  const entries = Object.fromEntries(
    Object.entries(sourceEntries)
      .filter(([key]) => /^(?:attribute|block|effect|enchantment|item)\./.test(key))
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
  )
  const snapshot: VanillaLanguageSnapshot = {
    minecraftVersion,
    assetIndex: metadata.assetIndex.id,
    objectSha1: expectedLanguageSha1,
    sourceUrl,
    entries
  }
  const output = `${JSON.stringify(snapshot, null, 2)}\n`

  if (checkOnly) {
    if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== output) {
      throw new Error('Снимок vanilla ru_ru.json устарел. Выполни bun run vanilla:sync')
    }
    console.log(`Vanilla ${minecraftVersion}: снимок актуален, ${Object.keys(entries).length} строк`)
    return
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, output)
  console.log(`Vanilla ${minecraftVersion}: сохранено ${Object.keys(entries).length} строк`)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} при загрузке ${url}`)
  }
  return await response.json() as T
}

async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} при загрузке ${url}`)
  }
  return Buffer.from(await response.arrayBuffer())
}
