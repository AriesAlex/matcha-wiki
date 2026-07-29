import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

type JsonObject = Record<string, JsonValue>
type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null

interface JsonLocalization {
  kind: 'json'
  file: string
  jsonPath: string
  key: string
  en: string
  ru: string
}

interface FunctionLocalization {
  kind: 'mcfunction'
  file: string
  line: number
  componentIndex: number
  key: string
  en: string
  ru: string
}

type LocalizationEntry = JsonLocalization | FunctionLocalization

interface LanguageLocalization {
  key: string
  en: string
  ru: string
}

interface LocalizationRegistry {
  schemaVersion: 1
  entries: LocalizationEntry[]
  languageOnly: LanguageLocalization[]
  vanillaFallbackKeys: string[]
}

export type DeferredReason =
  | 'commented_out_command'
  | 'persistent_loot_component'
  | 'persistent_recipe_result_component'
  | 'persistent_trade_component'
  | 'plain_command_has_no_translate_component'
  | 'runtime_or_matching_semantics_unclassified'
  | 'technical_component_identifier'

export interface DeferredLiteral {
  source: 'json' | 'mcfunction'
  file: string
  jsonPointer?: string
  line?: number
  componentIndex?: number
  literal: string
  reason: DeferredReason
}

interface DeferredInventory {
  schemaVersion: 1
  generatedBy: string
  reasons: Record<DeferredReason, string>
  summary: {
    entries: number
    byReason: Record<string, number>
  }
  entries: DeferredLiteral[]
}

export interface LocalizationAudit {
  registryEntries: number
  deferredEntries: number
  translateKeys: number
  translatableLiterals: DeferredLiteral[]
  unresolvedKeys: string[]
  staleInventory: boolean
}

interface ParsedCommandComponent {
  start: number
  value: JsonValue
}

interface TextComponentSlot {
  component?: JsonObject
  literal?: string
  path: string
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packDir = resolve(rootDir, 'pack')
const dataDir = resolve(packDir, 'data')
const languageDir = resolve(packDir, 'assets/minecraft/lang')
const localizationDir = resolve(rootDir, 'wiki-data/localization')
const registryPath = resolve(localizationDir, 'runtime-text.json')
const deferredPath = resolve(localizationDir, 'deferred-literals.json')
const vanillaRuPath = resolve(rootDir, 'wiki-data/vanilla-ru.json')

const englishLocales = ['en_us', 'en_au', 'en_ca', 'en_gb'] as const
const allLocales = [...englishLocales, 'ru_ru'] as const

const deferredReasons: Record<DeferredReason, string> = {
  commented_out_command:
    'Команда закомментирована и не исполняется; менять её вместе с рабочим runtime-контентом опасно.',
  persistent_loot_component:
    'Строка входит в выдаваемый loot-компонент. Замена literal на translate изменит сериализованный ItemStack или entity component.',
  persistent_recipe_result_component:
    'Строка входит в components результата recipe. Старые и новые предметы получат разные сериализованные компоненты и могут перестать складываться.',
  persistent_trade_component:
    'Строка входит в предмет villager trade. Изменение затронет сохранённые офферы или выдаваемые ItemStack.',
  plain_command_has_no_translate_component:
    'Команда say/tell хранит обычный текст и не поддерживает translate component без смены типа команды и её семантики.',
  runtime_or_matching_semantics_unclassified:
    'Строка находится вне доказанно безопасной UI-поверхности; перед миграцией нужно проверить runtime и component matching.',
  technical_component_identifier:
    'Поле является строковым техническим идентификатором внутри компонента, а не TextComponent; объект translate здесь не декодируется.'
}

if (import.meta.main) {
  main()
}

function main(): void {
  const write = process.argv.includes('--write')
  if (write) {
    applyRegistry()
    writeDeferredInventory()
  }

  const audit = auditPackLocalization()
  assertAudit(audit)
  console.log(
    `Matcha localization: ${audit.registryEntries} runtime-компонентов, `
    + `${audit.deferredEntries} совместимо оставленных literals, `
    + `${audit.translateKeys} используемых translate-ключей`
  )
}

export function auditPackLocalization(): LocalizationAudit {
  const registry = readRegistry()
  validateRegistry(registry)
  validateRegistryTargets(registry)
  validateRegistryLanguages(registry)

  const translatableLiterals = collectTranslatableLiterals()
  const deferred = collectDeferredLiterals()
  const expectedInventory = createDeferredInventory(deferred)
  const actualInventory = existsSync(deferredPath)
    ? readJson<DeferredInventory>(deferredPath)
    : undefined
  const translateKeys = collectUsedTranslateKeys()
  const unresolvedKeys = findUnresolvedKeys(
    translateKeys,
    registry.vanillaFallbackKeys
  )

  return {
    registryEntries: registry.entries.length,
    deferredEntries: deferred.length,
    translateKeys: translateKeys.size,
    translatableLiterals,
    unresolvedKeys,
    staleInventory: JSON.stringify(actualInventory) !== JSON.stringify(expectedInventory)
  }
}

export function assertAudit(audit: LocalizationAudit): void {
  const failures: string[] = []

  if (audit.translatableLiterals.length > 0) {
    failures.push(
      'Найдены новые literals в безопасных translate-поверхностях:\n'
      + audit.translatableLiterals
        .map(formatDeferredLiteral)
        .join('\n')
    )
  }
  if (audit.unresolvedKeys.length > 0) {
    failures.push(`Не разрешены translate-ключи:\n${audit.unresolvedKeys.join('\n')}`)
  }
  if (audit.staleInventory) {
    failures.push(
      'wiki-data/localization/deferred-literals.json не соответствует pack. '
      + 'Проверь изменение и запусти bun run localization --write.'
    )
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n\n'))
  }
}

function applyRegistry(): void {
  const registry = readRegistry()
  validateRegistry(registry)
  validateMigrationSources(registry)

  const jsonEntries = registry.entries.filter(
    (entry): entry is JsonLocalization => entry.kind === 'json'
  )
  const entriesByFile = Map.groupBy(jsonEntries, entry => entry.file)

  for (const [file, entries] of entriesByFile) {
    const path = packPath(file)
    const value = readJson<JsonValue>(path)

    for (const entry of entries) {
      const component = getJsonPath(value, entry.jsonPath)
      const translated = localizedComponent(component, entry)
      setJsonPath(value, entry.jsonPath, translated)
    }

    writeJson(path, value)
  }

  const functionEntries = registry.entries.filter(
    (entry): entry is FunctionLocalization => entry.kind === 'mcfunction'
  )
  const functionEntriesByFile = Map.groupBy(functionEntries, entry => entry.file)

  for (const [file, entries] of functionEntriesByFile) {
    const path = packPath(file)
    const lines = readFileSync(path, 'utf8').replaceAll('\r\n', '\n').split('\n')

    for (const entry of entries) {
      const lineIndex = entry.line - 1
      const line = lines[lineIndex]
      if (line === undefined) {
        throw new Error(`${entry.file}:${entry.line}: строка отсутствует`)
      }

      const parsed = parseCommandComponent(line)
      if (!parsed) {
        throw new Error(`${entry.file}:${entry.line}: JSON-компонент не найден`)
      }

      const slots = collectTextComponentSlots(parsed.value)
      const slot = slots[entry.componentIndex]
      if (!slot?.component) {
        throw new Error(
          `${entry.file}:${entry.line}: componentIndex=${entry.componentIndex} не найден`
        )
      }

      const currentText = slot.component.text
      const currentKey = slot.component.translate
      if (currentKey === entry.key && currentText === undefined) {
        continue
      }
      if (currentText !== entry.ru) {
        throw new Error(
          `${entry.file}:${entry.line}#${entry.componentIndex}: ожидался literal `
          + `${JSON.stringify(entry.ru)}, получено ${JSON.stringify(currentText)}`
        )
      }

      slot.component.translate = entry.key
      delete slot.component.text
      lines[lineIndex] = `${line.slice(0, parsed.start)}${JSON.stringify(parsed.value)}`
    }

    writeFileSync(path, lines.join('\n'), 'utf8')
  }

  for (const locale of allLocales) {
    const path = resolve(languageDir, `${locale}.json`)
    const language = readJson<Record<string, string>>(path)

    for (const entry of languageEntries(registry)) {
      const expected = locale === 'ru_ru' ? entry.ru : entry.en
      const current = language[entry.key]
      if (current !== undefined && current !== expected) {
        throw new Error(
          `${relative(rootDir, path)}: ключ ${entry.key} уже имеет другое значение`
        )
      }
      language[entry.key] = expected
    }

    writeJson(path, language)
  }
}

function validateMigrationSources(registry: LocalizationRegistry): void {
  for (const entry of registry.entries) {
    if (entry.kind === 'json') {
      const value = readJson<JsonValue>(packPath(entry.file))
      const component = getJsonPath(value, entry.jsonPath)
      const isExpectedLiteral = component === entry.ru
        || (isObject(component) && component.text === entry.ru)
      const isExpectedTranslation = isObject(component)
        && component.translate === entry.key
        && component.text === undefined

      if (!isExpectedLiteral && !isExpectedTranslation) {
        throw new Error(
          `${entry.file}#${entry.jsonPath}: source отличается от registry`
        )
      }
      continue
    }

    const lines = readFileSync(packPath(entry.file), 'utf8')
      .replaceAll('\r\n', '\n')
      .split('\n')
    const line = lines[entry.line - 1]
    const parsed = line === undefined ? undefined : parseCommandComponent(line)
    const slot = parsed
      ? collectTextComponentSlots(parsed.value)[entry.componentIndex]
      : undefined
    const isExpectedLiteral = slot?.component?.text === entry.ru
    const isExpectedTranslation = slot?.component?.translate === entry.key
      && slot.component.text === undefined

    if (!isExpectedLiteral && !isExpectedTranslation) {
      throw new Error(
        `${entry.file}:${entry.line}#${entry.componentIndex}: `
        + 'source отличается от registry'
      )
    }
  }

  for (const locale of allLocales) {
    const path = resolve(languageDir, `${locale}.json`)
    const language = readJson<Record<string, string>>(path)
    for (const entry of languageEntries(registry)) {
      const expected = locale === 'ru_ru' ? entry.ru : entry.en
      const current = language[entry.key]
      if (current !== undefined && current !== expected) {
        throw new Error(
          `${relative(rootDir, path)}: ключ ${entry.key} уже имеет другое значение`
        )
      }
    }
  }
}

function localizedComponent(
  component: JsonValue | undefined,
  entry: JsonLocalization
): JsonObject {
  if (typeof component === 'string') {
    if (component !== entry.ru) {
      throw new Error(
        `${entry.file}#${entry.jsonPath}: ожидался literal `
        + `${JSON.stringify(entry.ru)}, получено ${JSON.stringify(component)}`
      )
    }
    return { translate: entry.key }
  }

  if (!isObject(component)) {
    throw new Error(`${entry.file}#${entry.jsonPath}: text component не найден`)
  }

  if (component.translate === entry.key && component.text === undefined) {
    return component
  }
  if (component.text !== entry.ru) {
    throw new Error(
      `${entry.file}#${entry.jsonPath}: ожидался literal `
      + `${JSON.stringify(entry.ru)}, получено ${JSON.stringify(component.text)}`
    )
  }

  const translated: JsonObject = {}
  for (const [key, value] of Object.entries(component)) {
    if (key === 'text') {
      translated.translate = entry.key
    } else {
      translated[key] = value
    }
  }
  return translated
}

function validateRegistry(registry: LocalizationRegistry): void {
  if (
    registry.schemaVersion !== 1
    || registry.entries.length === 0
    || !Array.isArray(registry.languageOnly)
    || !Array.isArray(registry.vanillaFallbackKeys)
  ) {
    throw new Error('Некорректный или пустой runtime-text.json')
  }

  const keys = new Set<string>()
  const targets = new Set<string>()
  for (const entry of languageEntries(registry)) {
    if (keys.has(entry.key)) {
      throw new Error(`Дублирующийся localization key: ${entry.key}`)
    }
    keys.add(entry.key)
    if (entry.key === '' || typeof entry.en !== 'string' || typeof entry.ru !== 'string') {
      throw new Error(`Некорректная localization entry: ${entry.key}`)
    }
  }

  for (const entry of registry.entries) {
    const target = entry.kind === 'json'
      ? `${entry.file}#${entry.jsonPath}`
      : `${entry.file}:${entry.line}#${entry.componentIndex}`
    if (targets.has(target)) {
      throw new Error(`Дублирующаяся localization target: ${target}`)
    }
    targets.add(target)

    if (!entry.file.startsWith('data/')) {
      throw new Error(`Localization target вне pack/data: ${entry.file}`)
    }
    packPath(entry.file)
  }

  const vanillaKeys = new Set<string>()
  for (const key of registry.vanillaFallbackKeys) {
    if (key === '' || vanillaKeys.has(key) || keys.has(key)) {
      throw new Error(`Некорректный vanilla fallback key: ${key}`)
    }
    vanillaKeys.add(key)
  }
}

function validateRegistryTargets(registry: LocalizationRegistry): void {
  for (const entry of registry.entries) {
    if (entry.kind === 'json') {
      const value = readJson<JsonValue>(packPath(entry.file))
      const component = getJsonPath(value, entry.jsonPath)
      if (
        !isObject(component)
        || component.translate !== entry.key
        || component.text !== undefined
      ) {
        throw new Error(
          `${entry.file}#${entry.jsonPath}: ожидался translate ${entry.key}`
        )
      }
      continue
    }

    const lines = readFileSync(packPath(entry.file), 'utf8')
      .replaceAll('\r\n', '\n')
      .split('\n')
    const line = lines[entry.line - 1]
    const parsed = line === undefined ? undefined : parseCommandComponent(line)
    const slot = parsed
      ? collectTextComponentSlots(parsed.value)[entry.componentIndex]
      : undefined
    if (
      !slot?.component
      || slot.component.translate !== entry.key
      || slot.component.text !== undefined
    ) {
      throw new Error(
        `${entry.file}:${entry.line}#${entry.componentIndex}: `
        + `ожидался translate ${entry.key}`
      )
    }
  }
}

function validateRegistryLanguages(registry: LocalizationRegistry): void {
  const languages = new Map(
    allLocales.map(locale => [
      locale,
      readJson<Record<string, string>>(resolve(languageDir, `${locale}.json`))
    ])
  )

  for (const entry of languageEntries(registry)) {
    for (const locale of allLocales) {
      const expected = locale === 'ru_ru' ? entry.ru : entry.en
      const actual = languages.get(locale)?.[entry.key]
      if (actual !== expected) {
        throw new Error(
          `lang/${locale}.json: ${entry.key}: ожидалось `
          + `${JSON.stringify(expected)}, получено ${JSON.stringify(actual)}`
        )
      }
    }
  }
}

function collectTranslatableLiterals(): DeferredLiteral[] {
  const literals: DeferredLiteral[] = []

  for (const path of walk(dataDir).filter(file => extname(file) === '.json')) {
    const file = packRelative(path)
    const value = readJson<JsonValue>(path)
    walkJson(value, [], (node, pointer) => {
      if (typeof node.text === 'string' && isSafeJsonTextSurface(file, pointer)) {
        literals.push({
          source: 'json',
          file,
          jsonPointer: jsonPointer([...pointer, 'text']),
          literal: node.text,
          reason: 'runtime_or_matching_semantics_unclassified'
        })
      }
    }, (literal, pointer) => {
      if (literal !== '' && isSafeDirectJsonSurface(file, pointer)) {
        literals.push({
          source: 'json',
          file,
          jsonPointer: jsonPointer(pointer),
          literal,
          reason: 'runtime_or_matching_semantics_unclassified'
        })
      }
    })
  }

  for (const path of walk(dataDir).filter(file => extname(file) === '.mcfunction')) {
    const file = packRelative(path)
    const lines = readFileSync(path, 'utf8').replaceAll('\r\n', '\n').split('\n')
    lines.forEach((line, index) => {
      if (line.trimStart().startsWith('#') || !isTextCommand(line)) {
        return
      }
      const parsed = parseCommandComponent(line)
      if (!parsed) {
        return
      }
      collectTextComponentSlots(parsed.value).forEach((slot, componentIndex) => {
        const literal = typeof slot.component?.text === 'string'
          ? slot.component.text
          : slot.literal
        if (literal) {
          literals.push({
            source: 'mcfunction',
            file,
            line: index + 1,
            componentIndex,
            literal,
            reason: 'runtime_or_matching_semantics_unclassified'
          })
        }
      })
    })
  }

  return sortDeferred(literals)
}

function collectDeferredLiterals(): DeferredLiteral[] {
  const literals: DeferredLiteral[] = []

  for (const path of walk(dataDir).filter(file => extname(file) === '.json')) {
    const file = packRelative(path)
    const value = readJson<JsonValue>(path)
    walkJson(value, [], (node, pointer) => {
      if (
        typeof node.text === 'string'
        && node.text !== ''
        && !isSafeJsonTextSurface(file, pointer)
      ) {
        literals.push({
          source: 'json',
          file,
          jsonPointer: jsonPointer([...pointer, 'text']),
          literal: node.text,
          reason: reasonForJsonFile(file)
        })
      }
    }, (literal, pointer, parent) => {
      if (
        literal !== ''
        && isDirectPersistentComponent(pointer, parent)
        && !isSafeDirectJsonSurface(file, pointer)
      ) {
        literals.push({
          source: 'json',
          file,
          jsonPointer: jsonPointer(pointer),
          literal,
          reason: reasonForJsonLiteral(file, pointer)
        })
      }
    })
  }

  for (const path of walk(dataDir).filter(file => extname(file) === '.mcfunction')) {
    const file = packRelative(path)
    const lines = readFileSync(path, 'utf8').replaceAll('\r\n', '\n').split('\n')
    lines.forEach((line, index) => {
      const trimmed = line.trimStart()
      const commented = trimmed.startsWith('#')
      const command = commented ? trimmed.replace(/^#\s*/, '') : line

      const parsed = parseCommandComponent(command)
      if (parsed && isTextCommand(command)) {
        collectTextComponentSlots(parsed.value).forEach((slot, componentIndex) => {
          const literal = typeof slot.component?.text === 'string'
            ? slot.component.text
            : slot.literal
          if (commented && literal) {
            literals.push({
              source: 'mcfunction',
              file,
              line: index + 1,
              componentIndex,
              literal,
              reason: 'commented_out_command'
            })
          }
        })
      }

      const plainMessage = plainCommandMessage(command)
      if (plainMessage) {
        literals.push({
          source: 'mcfunction',
          file,
          line: index + 1,
          literal: plainMessage,
          reason: commented
            ? 'commented_out_command'
            : 'plain_command_has_no_translate_component'
        })
      }
    })
  }

  return sortDeferred(literals)
}

function walkJson(
  value: JsonValue,
  pointer: string[],
  visitObject: (value: JsonObject, pointer: string[]) => void,
  visitString: (value: string, pointer: string[], parent: JsonValue) => void
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (typeof entry === 'string') {
        visitString(entry, [...pointer, String(index)], value)
      } else {
        walkJson(entry, [...pointer, String(index)], visitObject, visitString)
      }
    })
    return
  }
  if (!isObject(value)) {
    return
  }

  visitObject(value, pointer)
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      visitString(entry, [...pointer, key], value)
    } else {
      walkJson(entry, [...pointer, key], visitObject, visitString)
    }
  }
}

function isSafeJsonTextSurface(file: string, componentPointer: string[]): boolean {
  const pointer = componentPointer.join('/')
  return (
    /\/advancement\//.test(file)
    && /^display\/(title|description)(\/|$)/.test(pointer)
  ) || (
    /\/(enchantment|instrument|jukebox_song)\//.test(file)
    && /^description(\/|$)/.test(pointer)
  )
}

function isSafeDirectJsonSurface(file: string, pointer: string[]): boolean {
  const joined = pointer.join('/')
  return (
    /\/advancement\//.test(file)
    && /^display\/(title|description)$/.test(joined)
  ) || (
    /\/(enchantment|instrument|jukebox_song)\//.test(file)
    && joined === 'description'
  )
}

function isDirectPersistentComponent(
  pointer: string[],
  parent: JsonValue
): boolean {
  const key = pointer.at(-1)
  const parentKey = pointer.at(-2)
  if (
    key === 'minecraft:item_name'
    || key === 'minecraft:custom_name'
    || key === 'item_name'
    || key === 'custom_name'
  ) {
    return true
  }
  if (
    /^\d+$/.test(key ?? '')
    && (parentKey === 'minecraft:lore' || parentKey === 'lore')
  ) {
    return true
  }
  return (
    key === 'name'
    && isObject(parent)
    && typeof parent.function === 'string'
    && /(^|:)set_name$/.test(parent.function)
  )
}

function reasonForJsonFile(file: string): DeferredReason {
  const kind = file.split('/')[2]
  if (kind === 'recipe') {
    return 'persistent_recipe_result_component'
  }
  if (kind === 'loot_table') {
    return 'persistent_loot_component'
  }
  if (kind === 'villager_trade') {
    return 'persistent_trade_component'
  }
  return 'runtime_or_matching_semantics_unclassified'
}

function reasonForJsonLiteral(
  file: string,
  pointer: string[]
): DeferredReason {
  if (
    pointer.at(-1) === 'custom_name'
    && pointer.includes('minecraft:potion_contents')
  ) {
    return 'technical_component_identifier'
  }
  return reasonForJsonFile(file)
}

function createDeferredInventory(entries: DeferredLiteral[]): DeferredInventory {
  const byReason: Record<string, number> = {}
  for (const entry of entries) {
    byReason[entry.reason] = (byReason[entry.reason] ?? 0) + 1
  }

  return {
    schemaVersion: 1,
    generatedBy: 'scripts/localize-pack-text.ts',
    reasons: deferredReasons,
    summary: {
      entries: entries.length,
      byReason: Object.fromEntries(
        Object.entries(byReason).sort(([left], [right]) => left.localeCompare(right))
      )
    },
    entries
  }
}

function writeDeferredInventory(): void {
  writeJson(deferredPath, createDeferredInventory(collectDeferredLiterals()))
}

function collectUsedTranslateKeys(): Set<string> {
  const keys = new Set<string>()
  for (const path of walk(packDir)) {
    const extension = extname(path)
    if (extension === '.json' || extension === '.mcmeta') {
      collectTranslateKeys(readJson<JsonValue>(path), keys)
    } else if (extension === '.mcfunction') {
      const lines = readFileSync(path, 'utf8').replaceAll('\r\n', '\n').split('\n')
      for (const line of lines) {
        if (line.trimStart().startsWith('#')) {
          continue
        }
        const parsed = parseCommandComponent(line)
        if (parsed) {
          collectTranslateKeys(parsed.value, keys)
        }
      }
    }
  }
  return keys
}

function collectTranslateKeys(value: JsonValue, keys: Set<string>): void {
  if (Array.isArray(value)) {
    value.forEach(entry => collectTranslateKeys(entry, keys))
    return
  }
  if (!isObject(value)) {
    return
  }
  if (typeof value.translate === 'string') {
    keys.add(value.translate)
  }
  Object.values(value).forEach(entry => collectTranslateKeys(entry, keys))
}

function findUnresolvedKeys(
  keys: Set<string>,
  vanillaFallbackKeys: string[]
): string[] {
  const en = readJson<Record<string, string>>(resolve(languageDir, 'en_us.json'))
  const ru = readJson<Record<string, string>>(resolve(languageDir, 'ru_ru.json'))
  const vanillaRu = readJson<{ entries: Record<string, string> }>(vanillaRuPath).entries
  const vanillaFallbacks = new Set(vanillaFallbackKeys)

  return [...keys]
    .filter(key => {
      const isVanilla = vanillaRu[key] !== undefined || vanillaFallbacks.has(key)
      return (!isVanilla && en[key] === undefined) || (!isVanilla && ru[key] === undefined)
    })
    .sort()
}

function languageEntries(registry: LocalizationRegistry): LanguageLocalization[] {
  return [...registry.entries, ...registry.languageOnly]
}

function parseCommandComponent(line: string): ParsedCommandComponent | undefined {
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character !== '{' && character !== '[' && character !== '"') {
      continue
    }
    try {
      return {
        start: index,
        value: JSON.parse(line.slice(index)) as JsonValue
      }
    } catch {
      // Selectors and NBT can contain the same delimiters before the final component.
    }
  }
  return undefined
}

function collectTextComponentSlots(value: JsonValue): TextComponentSlot[] {
  const slots: TextComponentSlot[] = []

  function visit(node: JsonValue, path: string): void {
    if (typeof node === 'string') {
      slots.push({ literal: node, path })
      return
    }
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, `${path}/${index}`))
      return
    }
    if (!isObject(node)) {
      return
    }

    if (typeof node.text === 'string' || typeof node.translate === 'string') {
      slots.push({ component: node, path })
    }
    if (Array.isArray(node.extra)) {
      visit(node.extra, `${path}/extra`)
    }
    if (Array.isArray(node.with)) {
      visit(node.with, `${path}/with`)
    }
  }

  visit(value, '')
  return slots.filter(slot => slot.literal !== '')
}

function isTextCommand(line: string): boolean {
  return /\btellraw\s/.test(line)
    || /\btitle\s+\S+\s+(title|subtitle|actionbar)\s/.test(line)
}

function plainCommandMessage(line: string): string | undefined {
  const match = line.match(/(?:^|\s)(?:say|tell|msg|w|me)\s+(.+)$/)
  return match?.[1]
}

function getJsonPath(value: JsonValue, path: string): JsonValue | undefined {
  let current: JsonValue | undefined = value
  for (const segment of path.split('.')) {
    if (Array.isArray(current)) {
      current = current[Number(segment)]
    } else if (isObject(current)) {
      current = current[segment]
    } else {
      return undefined
    }
  }
  return current
}

function setJsonPath(value: JsonValue, path: string, replacement: JsonValue): void {
  const segments = path.split('.')
  const key = segments.pop()
  const parent = segments.length === 0
    ? value
    : getJsonPath(value, segments.join('.'))
  if (!key || (!isObject(parent) && !Array.isArray(parent))) {
    throw new Error(`Нельзя записать JSON path: ${path}`)
  }
  if (Array.isArray(parent)) {
    parent[Number(key)] = replacement
  } else {
    parent[key] = replacement
  }
}

function packPath(file: string): string {
  const path = resolve(packDir, file)
  const relativePath = relative(packDir, path)
  if (
    relativePath === ''
    || relativePath === '..'
    || relativePath.startsWith(`..${sep}`)
    || !existsSync(path)
  ) {
    throw new Error(`Некорректный или отсутствующий pack path: ${file}`)
  }
  return path
}

function packRelative(path: string): string {
  return relative(packDir, path).replaceAll('\\', '/')
}

function jsonPointer(segments: string[]): string {
  return `/${segments
    .map(segment => segment.replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('/')}`
}

function sortDeferred(entries: DeferredLiteral[]): DeferredLiteral[] {
  return entries.sort((left, right) => {
    const leftTarget = `${left.file}:${left.line ?? 0}:${left.jsonPointer ?? ''}:`
      + `${left.componentIndex ?? 0}:${left.literal}`
    const rightTarget = `${right.file}:${right.line ?? 0}:${right.jsonPointer ?? ''}:`
      + `${right.componentIndex ?? 0}:${right.literal}`
    return leftTarget.localeCompare(rightTarget)
  })
}

function formatDeferredLiteral(entry: DeferredLiteral): string {
  const location = entry.source === 'json'
    ? `${entry.file}#${entry.jsonPointer}`
    : `${entry.file}:${entry.line}#${entry.componentIndex ?? 0}`
  return `${location}: ${JSON.stringify(entry.literal)}`
}

function readRegistry(): LocalizationRegistry {
  return readJson<LocalizationRegistry>(registryPath)
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function walk(directory: string): string[] {
  return readdirSync(directory)
    .flatMap(name => {
      const path = resolve(directory, name)
      return statSync(path).isDirectory() ? walk(path) : [path]
    })
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
