import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import type {
  AdvancementView,
  IngredientView,
  ItemAttribute,
  ItemEffect,
  ItemSource,
  ItemView,
  RecipeView,
  StackView,
  WikiCatalog
} from '../app/types/wiki'

type JsonObject = Record<string, unknown>
type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null

interface CapturedVariant {
  stack: StackView
  source: ItemSource
}

interface AssetItem {
  id: string
  model: string
}

interface VanillaLanguageSnapshot {
  minecraftVersion: string
  assetIndex: string
  objectSha1: string
  sourceUrl: string
  entries: Record<string, string>
}

const rootDir = resolve(import.meta.dir, '..')
const packDir = resolve(rootDir, 'pack')
const generatedDir = resolve(rootDir, 'generated')
const publicGeneratedDir = resolve(rootDir, 'public/generated')
const dataDir = resolve(packDir, 'data')
const assetsDir = resolve(packDir, 'assets/minecraft')

const vanillaRu = readJson<VanillaLanguageSnapshot>(
  resolve(rootDir, 'wiki-data/vanilla-ru-26.2.json')
)
const packRu = readJson<Record<string, string>>(resolve(assetsDir, 'lang/ru_ru.json'))
const ru = { ...vanillaRu.entries, ...packRu }
const en = readJson<Record<string, string>>(resolve(assetsDir, 'lang/en_us.json'))

const effectNames: Record<string, string> = {
  absorption: 'Поглощение',
  bad_omen: 'Дурное знамение',
  blindness: 'Слепота',
  fire_resistance: 'Огнестойкость',
  haste: 'Спешка',
  health_boost: 'Прилив здоровья',
  hunger: 'Голод',
  instant_damage: 'Моментальный урон',
  instant_health: 'Моментальное исцеление',
  invisibility: 'Невидимость',
  jump_boost: 'Прыгучесть',
  levitation: 'Левитация',
  luck: 'Удача',
  mining_fatigue: 'Утомление',
  nausea: 'Тошнота',
  night_vision: 'Ночное зрение',
  poison: 'Отравление',
  regeneration: 'Регенерация',
  resistance: 'Сопротивление',
  saturation: 'Насыщение',
  slow_falling: 'Плавное падение',
  slowness: 'Замедление',
  speed: 'Скорость',
  strength: 'Сила',
  water_breathing: 'Подводное дыхание',
  weakness: 'Слабость',
  wither: 'Иссушение'
}

const equipmentPattern = /(axe|boots|bow|brush|chestplate|circlet|claymore|compass|crook|dolabra|earrings|elytra|hatchet|helmet|hoe|knife|laurel|leggings|mattock|pickaxe|shears|shield|shovel|spear|sword|trident)/
const materialPattern = /(adamant|alloy|amber|bronze|carbon|copper|diamond|divine_fragment|electrum|emerald|gem|gold|ingot|iron|nugget|opal|raw_|ruby|shakudo|silver|steel|sulfur|tallow|titanium|topaz|vermeil)/
const fishPattern = /(anchovy|arapaima|bass|blackfish|bluegill|bujurqui|carp|catfish|char$|crappie|eel|fish|flounder|flying_fish|gar$|gurnard|herring|killifish|lamprey|mahi_mahi|monkfish|moray|muskellunge|oarfish|opah|perch|pike|piranha|salmon|seabass|shad$|skate|sculpin|sturgeon|swordfish|tunisian_barb|walleye|whitefish|wolffish|wrasse)/
const foodPattern = /(apple|braised|bread|brownie|bruschetta|butter|canned|carrot|chocolate|cookie|crumble|cupcake|curry|danish|empanada|egg|food|french_toast|gimmari|gnocchi|jam|latke|meal|mead|melon|mochi|mushroom|naan|paneer|pickle|pie|potato|puerquito|pumpkin|pupusa|ramen|sorbet|stew|stroganoff|tea|toast|tomato)/

main()

function main(): void {
  assertSourceTree()
  emptyGeneratedDirectory(generatedDir)
  emptyGeneratedDirectory(publicGeneratedDir)
  copyPublicAssets()

  const tags = loadItemTags()
  const recipes = loadRecipes(tags)
  const variants = captureVariants()
  const items = buildItems(recipes, variants)
  const advancements = loadAdvancements()
  const packMeta = readJson<JsonObject>(resolve(packDir, 'pack.mcmeta'))
  const versionText = flattenText((packMeta.pack as JsonObject | undefined)?.description)
  const packVersion = versionText.match(/Matcha Flavou?red\D*(\d+\.\d+)/i)?.[1]
    ?? versionText.match(/(\d+\.\d+)\s+для/i)?.[1]
    ?? '1.03'
  const files = walkFiles(packDir)

  const catalog: WikiCatalog = {
    generatedAt: new Date().toISOString(),
    pack: {
      title: 'Matcha Flavoured',
      version: packVersion,
      minecraft: versionText.match(/\b26\.\d+(?:\.\d+)?\b/)?.[0] ?? '26.2',
      sha256: hashTree(files)
    },
    stats: {
      files: files.length,
      items: items.length,
      customItems: items.filter(item => item.isCustom).length,
      recipes: recipes.length,
      advancements: advancements.length
    },
    items,
    recipes,
    advancements
  }

  writeJson(resolve(generatedDir, 'catalog.json'), catalog)
  writeJson(resolve(generatedDir, 'search-index.json'), createSearchIndex(catalog))
  writeJson(resolve(generatedDir, 'meta.json'), {
    generatedAt: catalog.generatedAt,
    pack: catalog.pack,
    stats: catalog.stats
  })

  validateCatalog(catalog)
  console.log(
    `Matcha Wiki: ${catalog.stats.items} предметов, `
    + `${catalog.stats.recipes} рецептов, ${catalog.stats.advancements} достижений`
  )
}

function assertSourceTree(): void {
  for (const requiredPath of [
    resolve(packDir, 'pack.mcmeta'),
    resolve(packDir, 'assets/minecraft/lang/ru_ru.json'),
    resolve(packDir, 'data'),
    resolve(rootDir, 'wiki-data/vanilla-ru-26.2.json')
  ]) {
    if (!existsSync(requiredPath)) {
      throw new Error(`Не найден обязательный источник: ${relative(rootDir, requiredPath)}`)
    }
  }
}

function emptyGeneratedDirectory(target: string): void {
  const resolved = resolve(target)
  const allowed = [generatedDir, publicGeneratedDir]
  if (!allowed.includes(resolved) || !resolved.startsWith(`${rootDir}${sep}`)) {
    throw new Error(`Отказ очищать неожиданный путь: ${resolved}`)
  }

  rmSync(resolved, { recursive: true, force: true })
  mkdirSync(resolved, { recursive: true })
}

function copyPublicAssets(): void {
  const textureTarget = resolve(publicGeneratedDir, 'textures')
  mkdirSync(textureTarget, { recursive: true })

  for (const kind of ['item', 'block']) {
    const source = resolve(assetsDir, `textures/${kind}`)
    if (existsSync(source)) {
      cpSync(source, resolve(textureTarget, kind), { recursive: true })
    }
  }

  const uiTarget = resolve(publicGeneratedDir, 'ui')
  const containerTarget = resolve(uiTarget, 'container')
  mkdirSync(containerTarget, { recursive: true })

  copyIfExists(resolve(packDir, 'pack.png'), resolve(uiTarget, 'pack.png'))
  copyIfExists(
    resolve(assetsDir, 'textures/gui/title/background/panorama_0.png'),
    resolve(uiTarget, 'panorama.png')
  )

  for (const name of [
    'blast_furnace',
    'crafting_table',
    'furnace',
    'smithing',
    'smoker',
    'stonecutter'
  ]) {
    copyIfExists(
      resolve(assetsDir, `textures/gui/container/${name}.png`),
      resolve(containerTarget, `${name}.png`)
    )
  }
}

function copyIfExists(source: string, target: string): void {
  if (!existsSync(source)) {
    return
  }
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target)
}

function loadItemTags(): Map<string, string[]> {
  const directTags = new Map<string, string[]>()

  for (const path of walkFiles(dataDir, file => extname(file) === '.json' && normalizePath(file).includes('/tags/item/'))) {
    const relativePath = normalizePath(relative(dataDir, path))
    const [namespace, , , ...nameParts] = relativePath.split('/')
    const tagId = `${namespace}:${nameParts.join('/').replace(/\.json$/, '')}`
    const data = readJson<JsonObject>(path)
    const values = Array.isArray(data.values) ? data.values : []
    directTags.set(
      tagId,
      values
        .map(value => typeof value === 'string' ? value : isObject(value) ? value.id : undefined)
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.startsWith('#') ? `#${normalizeResource(value.slice(1), namespace)}` : normalizeResource(value, namespace))
    )
  }

  const resolved = new Map<string, string[]>()
  const resolveTag = (tag: string, seen = new Set<string>()): string[] => {
    if (resolved.has(tag)) {
      return resolved.get(tag) ?? []
    }
    if (seen.has(tag)) {
      return []
    }

    seen.add(tag)
    const values = directTags.get(tag) ?? []
    const items = values.flatMap(value => value.startsWith('#')
      ? resolveTag(value.slice(1), new Set(seen))
      : [value])
    const unique = [...new Set(items)]
    resolved.set(tag, unique)
    return unique
  }

  for (const tag of directTags.keys()) {
    resolveTag(tag)
  }

  return resolved
}

function loadRecipes(tags: Map<string, string[]>): RecipeView[] {
  const recipes: RecipeView[] = []

  for (const path of walkFiles(dataDir, file => extname(file) === '.json' && normalizePath(file).includes('/recipe/'))) {
    const sourcePath = normalizePath(relative(rootDir, path))
    const relativePath = normalizePath(relative(dataDir, path))
    const [namespace, , ...recipeParts] = relativePath.split('/')
    const recipePath = recipeParts.join('/').replace(/\.json$/, '')
    const data = readJson<JsonObject>(path)
    const type = typeof data.type === 'string' ? data.type : 'minecraft:unknown'
    const pattern = Array.isArray(data.pattern)
      ? data.pattern.filter((row): row is string => typeof row === 'string')
      : undefined
    const key = isObject(data.key)
      ? Object.fromEntries(
          Object.entries(data.key).map(([symbol, value]) => [symbol, normalizeIngredient(value, tags)])
        )
      : undefined

    let ingredients: IngredientView[]
    if (key && pattern) {
      const usedSymbols = [...new Set(pattern.join('').replaceAll(' ', '').split(''))]
      ingredients = usedSymbols.map(symbol => key[symbol]).filter(Boolean)
    } else if (Array.isArray(data.ingredients)) {
      ingredients = data.ingredients.map(value => normalizeIngredient(value, tags))
    } else if (data.ingredient !== undefined) {
      ingredients = [normalizeIngredient(data.ingredient, tags)]
    } else {
      ingredients = ['template', 'base', 'addition']
        .filter(field => data[field] !== undefined)
        .map(field => normalizeIngredient(data[field], tags))
    }

    const result = parseStack(data.result)

    recipes.push({
      id: `${namespace}:${recipePath}`,
      namespace,
      path: recipePath,
      sourcePath,
      type,
      station: stationName(type),
      category: typeof data.category === 'string' ? data.category : undefined,
      group: typeof data.group === 'string' ? data.group : undefined,
      pattern,
      key,
      ingredients,
      result,
      experience: typeof data.experience === 'number' ? data.experience : undefined,
      cookingTime: typeof data.cookingtime === 'number'
        ? data.cookingtime
        : typeof data.cooking_time === 'number'
          ? data.cooking_time
          : undefined
    })
  }

  return recipes.sort((left, right) => {
    const stationOrder = left.station.localeCompare(right.station, 'ru')
    return stationOrder || resultName(left).localeCompare(resultName(right), 'ru')
  })
}

function captureVariants(): Map<string, CapturedVariant[]> {
  const variants = new Map<string, CapturedVariant[]>()

  for (const path of walkFiles(dataDir, file => extname(file) === '.json')) {
    if (statSync(path).size === 0) {
      continue
    }

    const sourcePath = normalizePath(relative(rootDir, path))
    const source = sourceFromPath(sourcePath)
    const data = readJson<JsonValue>(path)

    walkJson(data, undefined, value => {
      if (!isObject(value) || !isObject(value.components)) {
        return
      }

      const model = value.components['minecraft:item_model']
      if (typeof model !== 'string') {
        return
      }

      const stack = parseStack(value)
      if (!stack?.model) {
        return
      }

      const bucket = variants.get(stack.model) ?? []
      bucket.push({ stack, source })
      variants.set(stack.model, bucket)
    })

    walkJson(data, undefined, (value, inheritedCarrier) => {
      if (
        !isObject(value)
        || value.function !== 'minecraft:set_components'
        || !isObject(value.components)
        || typeof value.components['minecraft:item_model'] !== 'string'
      ) {
        return
      }

      const stack = parseStack({
        id: inheritedCarrier,
        components: value.components
      })
      if (!stack?.model) {
        return
      }

      const bucket = variants.get(stack.model) ?? []
      bucket.push({ stack, source })
      variants.set(stack.model, bucket)
    })
  }

  return variants
}

function walkJson(
  value: JsonValue,
  inheritedCarrier: string | undefined,
  visit: (value: JsonValue, inheritedCarrier: string | undefined) => void
): void {
  visit(value, inheritedCarrier)

  if (Array.isArray(value)) {
    for (const child of value) {
      walkJson(child, inheritedCarrier, visit)
    }
    return
  }

  if (!isObject(value)) {
    return
  }

  const ownCarrier = [value.id, value.name]
    .find(candidate => typeof candidate === 'string' && isResourceLocation(candidate))
  const nextCarrier = typeof ownCarrier === 'string' ? ownCarrier : inheritedCarrier

  for (const child of Object.values(value)) {
    if (isJsonValue(child)) {
      walkJson(child, nextCarrier, visit)
    }
  }
}

function buildItems(
  recipes: RecipeView[],
  variants: Map<string, CapturedVariant[]>
): ItemView[] {
  const assetItems = loadAssetItems()
  const modelIds = new Set([
    ...assetItems.map(item => item.model),
    ...variants.keys()
  ])
  const items: ItemView[] = []

  for (const model of modelIds) {
    const occurrences = variants.get(model) ?? []
    const richest = occurrences
      .map(item => item.stack)
      .sort((left, right) => JSON.stringify(right.components ?? {}).length - JSON.stringify(left.components ?? {}).length)[0]
    const asset = assetItems.find(item => item.model === model || item.id === model)
    const fallbackCarrier = asset?.id ?? model
    const carrier = richest?.carrier ?? fallbackCarrier
    const components = richest?.components ?? {}
    const modelPath = resourcePath(model)
    const candidateNameKey = richest?.nameKey
      ?? firstTranslationKey([
        `item.kleispack.${modelPath.replaceAll('/', '.')}`,
        `item.minecraft.${modelPath.replaceAll('/', '.')}`,
        `block.minecraft.${modelPath.replaceAll('/', '.')}`
      ])
    const name = candidateNameKey
      ? translateKey(candidateNameKey)
      : richest?.name || nameForResource(model)
    const description = candidateNameKey
      ? firstTranslation([
          `${candidateNameKey}.desc`,
          `${candidateNameKey}.description`
        ])
      : undefined
    const recipeIds = recipes
      .filter(recipe => recipe.result?.model === model || (
        !recipe.result?.model
        && recipe.result?.carrier === carrier
        && resourcePath(model) === resourcePath(carrier)
      ))
      .map(recipe => recipe.id)
    const sources = dedupeSources([
      ...occurrences.map(item => item.source),
      ...recipeIds.map(id => {
        const recipe = recipes.find(candidate => candidate.id === id)
        return recipe
          ? {
              kind: 'recipe',
              label: `Рецепт: ${recipe.station}`,
              path: recipe.sourcePath
            }
          : undefined
      }).filter((source): source is ItemSource => Boolean(source)),
      ...(asset
        ? [{
            kind: 'asset',
            label: 'Модель и текстура',
            path: `pack/assets/minecraft/items/${resourcePath(asset.id)}.json`
          }]
        : [])
    ])
    const isCustom = Boolean(
      candidateNameKey?.startsWith('item.kleispack.')
      || resourcePath(model) !== resourcePath(carrier)
      || richest?.model
    )

    items.push({
      id: model,
      slug: slugify(model),
      model,
      carrier,
      name,
      nameKey: candidateNameKey,
      description,
      icon: iconFor(carrier, model),
      category: itemCategory(modelPath, carrier, components),
      isCustom,
      lore: extractLore(components),
      effects: extractEffects(components),
      attributes: extractAttributes(components),
      componentKeys: Object.keys(components).sort(),
      components,
      recipeIds,
      sources,
      aliases: [...new Set([
        model,
        carrier,
        modelPath,
        en[candidateNameKey ?? ''] ?? ''
      ].filter(Boolean))]
    })
  }

  return items.sort((left, right) => {
    const customOrder = Number(right.isCustom) - Number(left.isCustom)
    return customOrder || left.name.localeCompare(right.name, 'ru')
  })
}

function loadAssetItems(): AssetItem[] {
  const itemDir = resolve(assetsDir, 'items')
  if (!existsSync(itemDir)) {
    return []
  }

  return walkFiles(itemDir, file => extname(file) === '.json').map(path => {
    const idPath = normalizePath(relative(itemDir, path)).replace(/\.json$/, '')
    const data = readJson<JsonObject>(path)
    const modelData = isObject(data.model) ? data.model : {}
    const modelReference = typeof modelData.model === 'string'
      ? modelData.model
      : `minecraft:item/${idPath}`

    return {
      id: `minecraft:${idPath}`,
      model: normalizeModelId(modelReference)
    }
  })
}

function loadAdvancements(): AdvancementView[] {
  const advancementDir = resolve(dataDir, 'main/advancement')
  const advancements: AdvancementView[] = []

  for (const path of walkFiles(advancementDir, file => extname(file) === '.json')) {
    const data = readJson<JsonObject>(path)
    if (!isObject(data.display)) {
      continue
    }

    const relativePath = normalizePath(relative(advancementDir, path)).replace(/\.json$/, '')
    const section = relativePath.includes('/') ? relativePath.split('/')[0] : 'other'
    const icon = parseStack(data.display.icon) ?? {
      carrier: 'minecraft:knowledge_book',
      count: 1,
      name: 'Достижение',
      icon: iconFor('minecraft:knowledge_book')
    }

    advancements.push({
      id: `main:${relativePath}`,
      slug: slugify(relativePath),
      section,
      parent: typeof data.parent === 'string' ? data.parent : undefined,
      title: flattenText(data.display.title) || formatIdentifier(relativePath),
      description: flattenText(data.display.description),
      icon,
      frame: typeof data.display.frame === 'string' ? data.display.frame : 'task',
      hidden: data.display.hidden === true,
      sourcePath: normalizePath(relative(rootDir, path))
    })
  }

  return sortAdvancements(advancements)
}

function sortAdvancements(advancements: AdvancementView[]): AdvancementView[] {
  const byId = new Map(advancements.map(item => [item.id, item]))
  const depthCache = new Map<string, number>()
  const depth = (item: AdvancementView, seen = new Set<string>()): number => {
    if (depthCache.has(item.id)) {
      return depthCache.get(item.id) ?? 0
    }
    if (!item.parent || seen.has(item.id)) {
      return 0
    }

    seen.add(item.id)
    const parent = byId.get(item.parent)
    const result = parent ? depth(parent, seen) + 1 : 1
    depthCache.set(item.id, result)
    return result
  }

  return advancements.sort((left, right) => {
    const section = left.section.localeCompare(right.section)
    return section || depth(left) - depth(right) || left.title.localeCompare(right.title, 'ru')
  })
}

function normalizeIngredient(value: unknown, tags: Map<string, string[]>): IngredientView {
  const candidates = Array.isArray(value) ? value : [value]
  const ids: string[] = []
  let tag: string | undefined

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      if (candidate.startsWith('#')) {
        tag = normalizeResource(candidate.slice(1))
        ids.push(...(tags.get(tag) ?? []))
      } else {
        ids.push(normalizeResource(candidate))
      }
      continue
    }

    if (!isObject(candidate)) {
      continue
    }

    const itemValue = candidate.item ?? candidate.id ?? candidate.items
    const tagValue = candidate.tag
    if (typeof tagValue === 'string') {
      tag = normalizeResource(tagValue.replace(/^#/, ''))
      ids.push(...(tags.get(tag) ?? []))
    }
    if (typeof itemValue === 'string') {
      if (itemValue.startsWith('#')) {
        tag = normalizeResource(itemValue.slice(1))
        ids.push(...(tags.get(tag) ?? []))
      } else {
        ids.push(normalizeResource(itemValue))
      }
    }
    if (Array.isArray(itemValue)) {
      ids.push(...itemValue.filter((item): item is string => typeof item === 'string').map(normalizeResource))
    }
  }

  const uniqueIds = [...new Set(ids)]
  const label = tag
    ? `Любой предмет из ${formatIdentifier(tag)}`
    : uniqueIds.map(nameForResource).join(' или ') || 'Особый ингредиент'

  return {
    ids: uniqueIds,
    tag,
    label,
    icons: uniqueIds
      .map(id => iconFor(id))
      .filter((icon): icon is string => Boolean(icon))
      .slice(0, 8)
  }
}

function parseStack(value: unknown): StackView | undefined {
  if (typeof value === 'string') {
    const carrier = normalizeResource(value)
    return {
      carrier,
      count: 1,
      name: nameForResource(carrier),
      icon: iconFor(carrier)
    }
  }
  if (!isObject(value)) {
    return undefined
  }

  const rawCarrier = [value.id, value.name]
    .find(candidate => typeof candidate === 'string' && isResourceLocation(candidate))
  const components = isObject(value.components) ? value.components : {}
  const rawModel = components['minecraft:item_model']
  const model = typeof rawModel === 'string' ? normalizeModelId(rawModel) : undefined
  const carrier = typeof rawCarrier === 'string'
    ? normalizeResource(rawCarrier)
    : model ?? 'minecraft:unknown'
  const nameComponent = components['minecraft:item_name'] ?? components['minecraft:custom_name']
  const nameKey = translationKey(nameComponent)
    ?? (model ? firstTranslationKey([`item.kleispack.${resourcePath(model).replaceAll('/', '.')}`]) : undefined)
  const name = nameKey
    ? translateKey(nameKey)
    : flattenText(nameComponent) || (model ? nameForResource(model) : nameForResource(carrier))

  return {
    carrier,
    count: typeof value.count === 'number' ? value.count : 1,
    model,
    name,
    nameKey,
    icon: iconFor(carrier, model),
    components
  }
}

function extractLore(components: JsonObject): string[] {
  const lore = components['minecraft:lore']
  return Array.isArray(lore)
    ? lore.map(flattenText).filter(Boolean)
    : []
}

function extractEffects(components: JsonObject): ItemEffect[] {
  const consumable = components['minecraft:consumable']
  if (!isObject(consumable) || !Array.isArray(consumable.on_consume_effects)) {
    return []
  }

  const result: ItemEffect[] = []
  for (const action of consumable.on_consume_effects) {
    if (!isObject(action) || !Array.isArray(action.effects)) {
      continue
    }

    for (const effect of action.effects) {
      if (!isObject(effect) || typeof effect.id !== 'string') {
        continue
      }
      const id = normalizeResource(effect.id)
      const path = resourcePath(id)
      result.push({
        id,
        name: effectNames[path] ?? formatIdentifier(path),
        level: typeof effect.amplifier === 'number' ? effect.amplifier + 1 : 1,
        durationSeconds: typeof effect.duration === 'number' ? Math.round(effect.duration / 20) : 0
      })
    }
  }

  return result
}

function extractAttributes(components: JsonObject): ItemAttribute[] {
  const attributeData = components['minecraft:attribute_modifiers']
  const modifiers = Array.isArray(attributeData)
    ? attributeData
    : isObject(attributeData) && Array.isArray(attributeData.modifiers)
      ? attributeData.modifiers
      : []

  return modifiers.flatMap(modifier => {
    if (!isObject(modifier)) {
      return []
    }
    const type = typeof modifier.type === 'string'
      ? modifier.type
      : typeof modifier.attribute === 'string'
        ? modifier.attribute
        : undefined
    if (!type || typeof modifier.amount !== 'number') {
      return []
    }

    return [{
      id: normalizeResource(type),
      name: formatIdentifier(type),
      amount: modifier.amount,
      operation: typeof modifier.operation === 'string' ? modifier.operation : 'add_value',
      slot: typeof modifier.slot === 'string' ? modifier.slot : undefined
    }]
  })
}

function itemCategory(modelPath: string, carrier: string, components: JsonObject): string {
  const value = modelPath.toLowerCase()
  if (value.startsWith('blessing_')) {
    return 'Благословения'
  }
  if (
    components['minecraft:food']
    || components['minecraft:consumable']
    || foodPattern.test(value)
  ) {
    return fishPattern.test(value) ? 'Рыбалка' : 'Еда и напитки'
  }
  if (fishPattern.test(value) || /(cod|salmon|tropical_fish|pufferfish)$/.test(carrier)) {
    return 'Рыбалка'
  }
  if (value.includes('music_disc')) {
    return 'Музыка'
  }
  if (equipmentPattern.test(value) || components['minecraft:equippable']) {
    return 'Снаряжение'
  }
  if (materialPattern.test(value)) {
    return 'Материалы'
  }
  if (/(book|avesta|comedy|enoch|paradise|quran|solomon|tanakh)/.test(value)) {
    return 'Книги и реликвии'
  }
  return 'Разное'
}

function sourceFromPath(path: string): ItemSource {
  const sourceKinds: Array<[string, string, string]> = [
    ['/recipe/', 'recipe', 'Рецепт'],
    ['/loot_table/', 'loot', 'Добыча'],
    ['/villager_trade/', 'trade', 'Торговля'],
    ['/advancement/', 'advancement', 'Достижение'],
    ['/function/', 'function', 'Функция']
  ]
  const match = sourceKinds.find(([part]) => path.includes(part))
  return {
    kind: match?.[1] ?? 'data',
    label: match?.[2] ?? 'Игровые данные',
    path
  }
}

function dedupeSources(sources: ItemSource[]): ItemSource[] {
  return [...new Map(sources.map(source => [`${source.kind}:${source.path}`, source])).values()]
    .sort((left, right) => left.label.localeCompare(right.label, 'ru') || left.path.localeCompare(right.path))
}

function stationName(type: string): string {
  if (type.includes('crafting_shaped') || type.includes('crafting_shapeless')) {
    return 'Верстак'
  }
  if (type.includes('blasting')) {
    return 'Плавильная печь'
  }
  if (type.includes('smoking')) {
    return 'Коптильня'
  }
  if (type.includes('smelting')) {
    return 'Печь'
  }
  if (type.includes('campfire')) {
    return 'Костёр'
  }
  if (type.includes('stonecutting')) {
    return 'Камнерез'
  }
  if (type.includes('smithing')) {
    return 'Кузнечный стол'
  }
  if (type.includes('transmute')) {
    return 'Преобразование'
  }
  return 'Особый рецепт'
}

function iconFor(carrier: string, model?: string): string | undefined {
  if (model) {
    const modelTexture = textureForModel(model)
    if (modelTexture) {
      return modelTexture
    }
  }

  const path = resourcePath(carrier)
  for (const type of ['item', 'block']) {
    const source = resolve(assetsDir, `textures/${type}/${path}.png`)
    if (existsSync(source)) {
      return `/generated/textures/${type}/${path}.png`
    }
  }

  return undefined
}

function textureForModel(model: string, seen = new Set<string>()): string | undefined {
  const normalized = normalizeModelId(model)
  if (seen.has(normalized)) {
    return undefined
  }
  seen.add(normalized)

  const path = resourcePath(normalized).replace(/^item\//, '')
  const modelPath = resolve(assetsDir, `models/item/${path}.json`)
  if (!existsSync(modelPath)) {
    return iconFor(`minecraft:${path}`)
  }

  const data = readJson<JsonObject>(modelPath)
  if (isObject(data.textures)) {
    const layer = data.textures.layer0 ?? data.textures.all
    if (typeof layer === 'string' && !layer.startsWith('#')) {
      return publicTexture(layer)
    }
  }

  return typeof data.parent === 'string'
    ? textureForModel(data.parent, seen)
    : iconFor(`minecraft:${path}`)
}

function publicTexture(reference: string): string | undefined {
  const normalized = normalizeResource(reference)
  const namespace = resourceNamespace(normalized)
  if (namespace !== 'minecraft') {
    return undefined
  }

  const path = resourcePath(normalized)
  const source = resolve(packDir, `assets/${namespace}/textures/${path}.png`)
  return existsSync(source) ? `/generated/textures/${path}.png` : undefined
}

function nameForResource(resource: string): string {
  const path = resourcePath(resource).replaceAll('/', '.')
  return firstTranslation([
    `item.kleispack.${path}`,
    `item.minecraft.${path}`,
    `block.minecraft.${path}`
  ]) ?? formatIdentifier(resource)
}

function firstTranslation(keys: string[]): string | undefined {
  const key = firstTranslationKey(keys)
  return key ? translateKey(key) : undefined
}

function firstTranslationKey(keys: string[]): string | undefined {
  return keys.find(key => ru[key] !== undefined || en[key] !== undefined)
}

function translateKey(key: string): string {
  return ru[key] ?? en[key] ?? formatIdentifier(key)
}

function translationKey(value: unknown): string | undefined {
  return isObject(value) && typeof value.translate === 'string'
    ? value.translate
    : undefined
}

function flattenText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(flattenText).join('')
  }
  if (!isObject(value)) {
    return ''
  }

  const ownText = typeof value.text === 'string'
    ? value.text
    : typeof value.translate === 'string'
      ? translateKey(value.translate)
      : ''
  const extra = Array.isArray(value.extra) ? value.extra.map(flattenText).join('') : ''
  return `${ownText}${extra}`.replace(/§[0-9a-fk-or]/gi, '').trim()
}

function createSearchIndex(catalog: WikiCatalog): Array<Record<string, unknown>> {
  return [
    ...catalog.items.map(item => ({
      kind: 'item',
      title: item.name,
      description: item.description ?? item.category,
      path: `/items/${item.slug}`,
      icon: item.icon,
      terms: [
        item.name,
        item.description,
        item.category,
        ...item.aliases
      ].filter(Boolean).join(' ')
    })),
    ...catalog.recipes.map(recipe => ({
      kind: 'recipe',
      title: recipe.result?.name ?? recipe.id,
      description: `${recipe.station}: ${recipe.ingredients.map(ingredient => ingredient.label).join(', ')}`,
      path: `/recipes/${recipe.namespace}/${recipe.path}`,
      icon: recipe.result?.icon,
      terms: [
        recipe.id,
        recipe.station,
        recipe.type,
        recipe.result?.name,
        recipe.result?.carrier,
        ...recipe.ingredients.flatMap(ingredient => [
          ingredient.label,
          ingredient.tag,
          ...ingredient.ids
        ])
      ].filter(Boolean).join(' ')
    })),
    ...catalog.advancements.map(advancement => ({
      kind: 'advancement',
      title: advancement.title,
      description: advancement.description,
      path: '/progression',
      icon: advancement.icon.icon,
      terms: `${advancement.title} ${advancement.description} ${advancement.id}`
    }))
  ]
}

function validateCatalog(catalog: WikiCatalog): void {
  const itemSlugs = new Set<string>()
  for (const item of catalog.items) {
    if (itemSlugs.has(item.slug)) {
      throw new Error(`Повторяющийся slug предмета: ${item.slug}`)
    }
    itemSlugs.add(item.slug)
    for (const recipeId of item.recipeIds) {
      if (!catalog.recipes.some(recipe => recipe.id === recipeId)) {
        throw new Error(`Предмет ${item.id} ссылается на отсутствующий рецепт ${recipeId}`)
      }
    }
  }

  const recipeIds = new Set<string>()
  for (const recipe of catalog.recipes) {
    if (recipeIds.has(recipe.id)) {
      throw new Error(`Повторяющийся ID рецепта: ${recipe.id}`)
    }
    recipeIds.add(recipe.id)
  }

  if (catalog.stats.files < 4_000 || catalog.stats.recipes < 900 || catalog.stats.items < 200) {
    throw new Error(`Каталог подозрительно мал: ${JSON.stringify(catalog.stats)}`)
  }
}

function resultName(recipe: RecipeView): string {
  return recipe.result?.name ?? recipe.id
}

function formatIdentifier(value: string): string {
  return value
    .replace(/^#/, '')
    .replace(/^[^:]+:/, '')
    .replaceAll('_', ' ')
    .replaceAll('/', ' ')
    .replace(/\b\p{L}/gu, letter => letter.toUpperCase())
}

function normalizeResource(value: string, defaultNamespace = 'minecraft'): string {
  const normalized = value.replace(/^#/, '')
  return normalized.includes(':') ? normalized : `${defaultNamespace}:${normalized}`
}

function normalizeModelId(value: string): string {
  const normalized = normalizeResource(value)
  const namespace = resourceNamespace(normalized)
  const path = resourcePath(normalized).replace(/^item\//, '')
  return `${namespace}:${path}`
}

function resourceNamespace(value: string): string {
  return normalizeResource(value).split(':', 2)[0]
}

function resourcePath(value: string): string {
  return normalizeResource(value).split(':', 2)[1]
}

function slugify(value: string): string {
  return normalizeResource(value)
    .replace(':', '-')
    .replaceAll('/', '-')
    .replaceAll('_', '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function isResourceLocation(value: string): boolean {
  return /^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(value)
}

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (error) {
    throw new Error(`Не удалось прочитать ${normalizePath(relative(rootDir, path))}`, { cause: error })
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function walkFiles(directory: string, include: (path: string) => boolean = () => true): string[] {
  if (!existsSync(directory)) {
    return []
  }

  const result: string[] = []
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) {
        visit(path)
      } else if (entry.isFile() && include(path)) {
        result.push(path)
      }
    }
  }
  visit(directory)
  return result
}

function hashTree(files: string[]): string {
  const hash = createHash('sha256')
  for (const path of files) {
    hash.update(normalizePath(relative(packDir, path)))
    hash.update('\0')
    hash.update(readFileSync(path))
    hash.update('\0')
  }
  return hash.digest('hex')
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return true
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }
  return isObject(value) && Object.values(value).every(isJsonValue)
}
