import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { unzipSync, zipSync, type Zippable } from 'fflate'

const rootDir = resolve(import.meta.dir, '..')
const packDir = resolve(rootDir, 'pack')
const distDir = resolve(rootDir, 'dist')
const archivePath = resolve(distDir, 'Matcha_Flavoured_1_03_RU.zip')

if (!existsSync(resolve(packDir, 'pack.mcmeta'))) {
  throw new Error('Не найден pack/pack.mcmeta')
}
if (!distDir.startsWith(`${rootDir}${sep}`)) {
  throw new Error(`Отказ очищать неожиданный путь: ${distDir}`)
}

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })

const files: Zippable = {}
for (const path of walkFiles(packDir)) {
  const archiveName = relative(packDir, path).replaceAll('\\', '/')
  files[archiveName] = [
    new Uint8Array(readFileSync(path)),
    { mtime: new Date('2000-01-01T00:00:00Z') }
  ]
}

for (const [sourceName, archiveName] of [
  ['LICENSE.md', 'MATCHA-WIKI-LICENSE.md'],
  ['TRANSLATION.md', 'TRANSLATION.md']
] as const) {
  const source = resolve(rootDir, sourceName)
  if (existsSync(source)) {
    files[archiveName] = [
      new TextEncoder().encode(readFileSync(source, 'utf8')),
      { mtime: new Date('2000-01-01T00:00:00Z') }
    ]
  }
}

const archive = zipSync(files, { level: 9 })
writeFileSync(archivePath, archive)

const unpacked = unzipSync(archive)
if (!unpacked['pack.mcmeta'] || !unpacked['assets/minecraft/lang/ru_ru.json']) {
  throw new Error('Собранный ZIP не содержит обязательные файлы в корне')
}

const sha256 = createHash('sha256').update(archive).digest('hex')
writeFileSync(
  resolve(distDir, 'SHA256SUMS.txt'),
  `${sha256}  ${archivePath.split(/[\\/]/).at(-1)}\n`
)

console.log(`Собран ${archivePath}`)
console.log(`Файлов: ${Object.keys(unpacked).length}; SHA-256: ${sha256}`)

function walkFiles(directory: string): string[] {
  const result: string[] = []
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) {
        visit(path)
      } else if (entry.isFile()) {
        result.push(path)
      }
    }
  }
  visit(directory)
  return result
}
