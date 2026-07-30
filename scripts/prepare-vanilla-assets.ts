import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { resolve } from 'node:path'
import { unzipSync, zipSync, type Zippable } from 'fflate'

interface VanillaVersion {
  pack: {
    version: string
  }
  minecraftVersion: string
  client: {
    url: string
    sha1: string
    size: number
  }
}

interface CacheManifest {
  schemaVersion: 2
  minecraftVersion: string
  clientSha1: string
  archiveSha256: string
  files: number
  fileCounts: Record<IncludedFileKind, number>
}

type IncludedFileKind =
  | 'itemDefinitions'
  | 'models'
  | 'textures'
  | 'itemTags'
  | 'recipes'

const rootDir = resolve(import.meta.dir, '..')
const version = readJson<VanillaVersion>(resolve(rootDir, 'wiki-data/project.json'))
const cacheDir = resolve(rootDir, '.cache/minecraft')
const archivePath = resolve(cacheDir, `wiki-assets-${version.minecraftVersion}.zip`)
const manifestPath = resolve(cacheDir, `wiki-assets-${version.minecraftVersion}.json`)
const refresh = process.argv.includes('--refresh')
const includedPaths: Array<{
  kind: IncludedFileKind
  pattern: RegExp
}> = [
  { kind: 'itemDefinitions', pattern: /^assets\/minecraft\/items\/.+\.json$/ },
  { kind: 'models', pattern: /^assets\/minecraft\/models\/(?:block|item)\/.+\.json$/ },
  { kind: 'textures', pattern: /^assets\/minecraft\/textures\/(?:block|item)\/.+\.png$/ },
  { kind: 'itemTags', pattern: /^data\/minecraft\/tags\/item\/.+\.json$/ },
  { kind: 'recipes', pattern: /^data\/minecraft\/recipe\/.+\.json$/ }
]

await main()

async function main(): Promise<void> {
  if (!refresh && validCache()) {
    const cache = readJson<CacheManifest>(manifestPath)
    console.log(
      `Vanilla ${version.minecraftVersion}: ${cache.files} wiki-ассетов из проверенного кэша`
    )
    return
  }

  const client = await loadClient()
  assertClient(client)

  const source = unzipSync(client)
  const files: Zippable = {}
  const fileCounts = emptyFileCounts()
  for (const path of Object.keys(source).sort((left, right) => left.localeCompare(right, 'en'))) {
    const included = includedPaths.find(entry => entry.pattern.test(path))
    if (!included) continue

    files[path] = [
      source[path],
      { mtime: new Date(1980, 0, 1) }
    ]
    fileCounts[included.kind] += 1
  }

  const fileCount = Object.keys(files).length
  if (fileCount < 9_000 || fileCounts.recipes < 1_000) {
    throw new Error(
      `В client.jar Minecraft ${version.minecraftVersion} найдено только ${fileCount} wiki-ассетов`
    )
  }

  const archive = zipSync(files, { level: 9 })
  const cache: CacheManifest = {
    schemaVersion: 2,
    minecraftVersion: version.minecraftVersion,
    clientSha1: version.client.sha1,
    archiveSha256: hash('sha256', archive),
    files: fileCount,
    fileCounts
  }

  mkdirSync(cacheDir, { recursive: true })
  writeFileSync(archivePath, archive)
  writeFileSync(manifestPath, `${JSON.stringify(cache, null, 2)}\n`)
  console.log(
    `Vanilla ${version.minecraftVersion}: подготовлено ${fileCount} моделей, текстур, тегов и рецептов`
  )
}

function validCache(): boolean {
  if (!existsSync(archivePath) || !existsSync(manifestPath)) {
    return false
  }

  try {
    const cache = readJson<CacheManifest>(manifestPath)
    const archive = readFileSync(archivePath)
    return cache.schemaVersion === 2
      && cache.minecraftVersion === version.minecraftVersion
      && cache.clientSha1 === version.client.sha1
      && cache.files >= 9_000
      && cache.fileCounts.recipes >= 1_000
      && cache.files === Object.values(cache.fileCounts)
        .reduce((total, count) => total + count, 0)
      && cache.archiveSha256 === hash('sha256', archive)
  } catch {
    return false
  }
}

async function loadClient(): Promise<Uint8Array> {
  const localPath = localClientPath()
  if (localPath) {
    console.log(`Vanilla ${version.minecraftVersion}: использую локальный официальный client.jar`)
    return readFileSync(localPath)
  }

  console.log(`Vanilla ${version.minecraftVersion}: загружаю официальный client.jar Mojang`)
  const response = await fetch(version.client.url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} при загрузке ${version.client.url}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

function localClientPath(): string | undefined {
  const explicitPath = process.env.MATCHA_MINECRAFT_CLIENT_JAR
  const appDataPath = process.env.APPDATA
    ? resolve(
        process.env.APPDATA,
        `PrismLauncher/libraries/com/mojang/minecraft/${version.minecraftVersion}`,
        `minecraft-${version.minecraftVersion}-client.jar`
      )
    : undefined

  return [explicitPath, appDataPath]
    .find((path): path is string => typeof path === 'string' && existsSync(path))
}

function assertClient(client: Uint8Array): void {
  if (client.byteLength !== version.client.size) {
    throw new Error(
      `Размер client.jar не совпал: ожидалось ${version.client.size}, получено ${client.byteLength}`
    )
  }

  const actualSha1 = hash('sha1', client)
  if (actualSha1 !== version.client.sha1) {
    throw new Error(
      `SHA-1 client.jar не совпал: ожидался ${version.client.sha1}, получен ${actualSha1}`
    )
  }
}

function hash(algorithm: 'sha1' | 'sha256', value: Uint8Array): string {
  return createHash(algorithm).update(value).digest('hex')
}

function emptyFileCounts(): Record<IncludedFileKind, number> {
  return {
    itemDefinitions: 0,
    models: 0,
    textures: 0,
    itemTags: 0,
    recipes: 0
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}
