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
import { unzipSync } from 'fflate'
import type {
  CraftingPlannerSupplement
} from '../app/types/crafting'
import {
  allTradeOffers,
  type TradeOfferView,
  type TraderView
} from '../app/types/entities'
import type {
  AdvancementGuide,
  AdvancementView,
  IngredientGlossaryEntry,
  IngredientView,
  ItemAttribute,
  ItemEnchantment,
  ItemEffect,
  ItemGuide,
  ItemRelationView,
  ItemSource,
  ItemView,
  RecipeView,
  StackView,
  WikiCatalog
} from '../app/types/wiki'
import { stationResourceForRecipe } from '../app/utils/craftingStation'
import { formatIngredientAlternatives } from '../app/utils/ingredientPresentation'
import {
  resolveStackItem
} from '../app/utils/itemReference'
import {
  buildRecipeRequirements,
  smithingRequirementRoles,
  type SmithingIngredients
} from './lib/recipeRequirements'
import { buildAcquisitionCatalog } from './lib/acquisition'
import { acquisitionTargetSlug } from './lib/acquisition/targetRoutes'
import { createSearchIndex } from './lib/searchIndex'
import {
  buildTraderViews,
  loadActiveTradeGraph,
  type TraderGuideRegistry
} from './lib/tradeEntities'
import {
  buildVanillaPlannerSupplement,
  type PackFilterEntry
} from './lib/vanillaPlannerRecipes'

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

interface ProjectManifest {
  pack: {
    title: string
    version: string
  }
  minecraftVersion: string
}

interface RawAdvancementGuide {
  spoiler?: boolean
  note?: string
  intendedPath?: string
  exactCondition: string
  link?: {
    label: string
    to: string
  }
  itemModels?: string[]
  recipeIds?: string[]
  searchTerms?: string[]
}

interface AdvancementGuideRegistry {
  schemaVersion: 1
  entries: Record<string, RawAdvancementGuide>
}

interface IngredientGuideRegistry {
  schemaVersion: 1
  entries: Record<string, string>
  tagNames: Record<string, string>
}

interface ItemGuideRegistry {
  schemaVersion: 1
  entries: Record<string, ItemGuide>
  itemNames: Record<string, string>
  lootLocations: Record<string, string>
  tradeProfessions: Record<string, string>
}

interface AcquisitionGuideRegistry {
  schemaVersion: 1
  entries: Record<string, ItemGuide>
}

interface SourceGuideRegistry {
  schemaVersion: 1
  mobs: Record<string, {
    name: string
  }>
}

interface LootTableRecord {
  id: string
  sourcePath: string
  references: string[]
}

const rootDir = resolve(import.meta.dir, '..')
const packDir = resolve(rootDir, 'pack')
const generatedDir = resolve(rootDir, 'generated')
const publicGeneratedDir = resolve(rootDir, 'public/generated')
const dataDir = resolve(packDir, 'data')
const assetsDir = resolve(packDir, 'assets/minecraft')
const project = readJson<ProjectManifest>(resolve(rootDir, 'wiki-data/project.json'))
const vanillaAssetsPath = resolve(
  rootDir,
  `.cache/minecraft/wiki-assets-${project.minecraftVersion}.zip`
)
const vanillaAssets = existsSync(vanillaAssetsPath)
  ? unzipSync(readFileSync(vanillaAssetsPath))
  : {}
const vanillaJson = new Map<string, JsonObject>()

const vanillaRu = readJson<VanillaLanguageSnapshot>(
  resolve(rootDir, 'wiki-data/vanilla-ru.json')
)
const packRu = readJson<Record<string, string>>(resolve(assetsDir, 'lang/ru_ru.json'))
const ru = { ...vanillaRu.entries, ...packRu }
const en = readJson<Record<string, string>>(resolve(assetsDir, 'lang/en_us.json'))
const runtimeRu: Record<string, string> = {
  'filled_map.buried_treasure': 'Карта зарытого клада'
}
const advancementGuideRegistry = readJson<AdvancementGuideRegistry>(
  resolve(rootDir, 'wiki-data/advancement-guides.json')
)
const ingredientGuideRegistry = readJson<IngredientGuideRegistry>(
  resolve(rootDir, 'wiki-data/ingredient-guides.ru.json')
)
const itemGuideRegistry = readJson<ItemGuideRegistry>(
  resolve(rootDir, 'wiki-data/item-guides.ru.json')
)
const acquisitionGuideRegistry = readJson<AcquisitionGuideRegistry>(
  resolve(rootDir, 'wiki-data/acquisition-guides.ru.json')
)
const traderGuideRegistry = readJson<TraderGuideRegistry>(
  resolve(rootDir, 'wiki-data/entity-guides.ru.json')
)
const sourceGuideRegistry = readJson<SourceGuideRegistry>(
  resolve(rootDir, 'wiki-data/source-guides.ru.json')
)
const enchantmentNames = loadEnchantmentNames()
const enchantmentDescriptions: Record<string, string> = {
  'main:anemos': 'После удара по существу или блоку выпускает заряд ветра в направлении взгляда. Перезарядка — 1 секунда.',
  'main:bloodrage': 'Пока топор в основной руке и у вас не больше 5 сердец, даёт Силу I и Сопротивление II: +3 урона и на 40 % меньше входящего урона.',
  'main:cleanse_armor_chest': 'Надетый нагрудник постоянно снимает Отравление и Иссушение.',
  'main:cleanse_armor_feet': 'Надетые ботинки постоянно снимают Левитацию.',
  'main:cleanse_armor_head': 'Надетый шлем постоянно снимает Слепоту и Тьму.',
  'main:cleanse_armor_legs': 'Надетые поножи постоянно снимают Замедление.',
  'main:conduit_power': 'Опаловые серьги постоянно дают Силу источника I и Грацию дельфина I: под водой легче дышать, видеть, добывать блоки и плавать.',
  'main:divinity': 'Каждая надетая часть адамантовой брони и адамантовый предмет в основной руке добавляют 2 возобновляемых сердца Поглощения. Пять предметов дают 10 сердец и обновляют щит каждые 15 секунд; один–четыре — каждые 30 секунд.',
  'main:fire_proof': 'Надетый рубиновый венец постоянно даёт Огнестойкость.',
  'main:freezing_protection': 'Снижает урон от замерзания, а на III уровне полностью исключает переохлаждение в воде холодных биомов.',
  'main:haste': 'Надетые топазовые серьги постоянно дают Спешку II.',
  'main:reach': 'Увеличивает дальность взаимодействия с блоками на 2 блока за каждый уровень.',
  'main:regeneration': 'Надетые янтарные серьги поддерживают Регенерацию I. Более сильную регенерацию они не заменяют и возвращают свой эффект после её окончания.',
  'main:riposte': 'После удара отбрасывает владельца бронзового меча назад с силой 0,458 за уровень и дополнительно расходует 1 прочность.',
  'main:sanguine': 'Каждый успешный удар палатинатовым мечом или копьём даёт владельцу Регенерацию III на 1 секунду. Удар по стойке для брони не считается.',
  'main:slaughter': 'Мясницкий тесак наносит домашнему скоту на 40 единиц урона больше и почти обездвиживает таких животных в радиусе 3 блоков Замедлением X.',
  'main:traversal': 'Повышает скорость передвижения на 10,5 % от обычной за каждый уровень на тропинке, гравии, каменистой земле, утрамбованной грязи или саманных кирпичах. На III уровне при срабатывании есть 12 % шанс потерять 1 прочность ботинок.',
  'main:warding0': 'В любой руке замедляет ближайшую нежить в радиусе 8 блоков. Ближайшая обычная нежить в радиусе 3 блоков получает до 20 урона в секунду; Иссушитель урона не получает.',
  'main:warding1': 'В любой руке замедляет ближайшую нежить в радиусе 8 блоков и наносит ближайшей обычной нежити и Иссушителю до 20 урона в секунду. Эффекты двух предметов могут складываться.',
  'main:warding2': 'Пока предмет в руке, ближайшая нежить в радиусе 12 блоков получает Замедление III и до 60 единиц урона в секунду; иссушитель — до 20.',
  'main:warding_armour': 'Сила ауры зависит от числа частей электрумовой брони. Одна часть замедляет нежить в радиусе 8 блоков и наносит до 2 урона в секунду; полный комплект действует в радиусе 24 блоков и раз в секунду наносит ближайшей обычной нежити 19 урона.',
  'main:zephyr': 'Приседайте примерно 2,25 секунды до полного заряда, затем окажитесь в воздухе и отпустите приседание, чтобы резко взлететь.'
}
const bannerColours: Record<string, string> = {
  black: '#1d1d21',
  blue: '#3c44aa',
  brown: '#835432',
  cyan: '#169c9c',
  gray: '#474f52',
  green: '#5e7c16',
  light_blue: '#3ab3da',
  light_gray: '#9d9d97',
  lime: '#80c71f',
  magenta: '#c74ebd',
  orange: '#f9801d',
  pink: '#f38baa',
  purple: '#8932b8',
  red: '#b02e26',
  white: '#f9fffe',
  yellow: '#fed83d'
}

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

interface VanillaPotionEffect {
  id: string
  amplifier: number
  duration: number
}

const vanillaPotionEffects: Record<string, VanillaPotionEffect[]> = {
  strong_healing: [{ id: 'minecraft:instant_health', amplifier: 1, duration: 0 }],
  strong_poison: [{ id: 'minecraft:poison', amplifier: 1, duration: 432 }]
}

const equipmentPattern = /(axe|boots|bow|brush|chestplate|circlet|claymore|compass|crook|dolabra|earrings|elytra|hatchet|helmet|hoe|knife|laurel|leggings|mattock|pickaxe|shears|shield|shovel|spear|sword|trident)/
const materialPattern = /(adamant|alloy|amber|bronze|carbon|copper|diamond|divine_fragment|electrum|emerald|gem|gold|ingot|iron|nugget|opal|raw_|ruby|shakudo|silver|steel|sulfur|tallow|titanium|topaz|vermeil)/
const fishPattern = /^(?:.*_)?(?:anchovy|arapaima|bass|blackfish|bluegill|bujurqui|carp|catfish|char|crappie|eel|fish|flounder|flying_fish|gar|gurnard|herring|killifish|lamprey|mahi_mahi|monkfish|moray|muskellunge|oarfish|opah|perch|pike|piranha|salmon|seabass|shad|skate|sculpin|sturgeon|swordfish|tunisian_barb|walleye|whitefish|wolffish|wrasse)(?:_.*)?$/
const foodPattern = /^(?!.*spawn_egg$)(?:.*_)?(?:apple|braised|bread|brownie|bruschetta|butter|canned|carrot|chocolate|cookie|crumble|cupcake|curry|danish|empanada|egg|food|french_toast|gimmari|gnocchi|jam|latke|meal|mead|melon|mochi|mushroom|naan|paneer|pickle|pie|potato|puerquito|pumpkin|pupusa|ramen|sorbet|stew|stroganoff|tea|toast|tomato)(?:_.*)?$/
const identityLoreNameKeys = new Set([
  'item.kleispack.blessing',
  'item.kleispack.cooking_recipe',
  'item.kleispack.ofuda'
])
const refugeeOrigins: Record<string, string> = {
  болотная: 'с болот',
  джунглей: 'из джунглей',
  пустынная: 'из пустыни',
  равнинная: 'с равнин',
  таёжная: 'из тайги'
}

main()

function main(): void {
  assertSourceTree()
  emptyGeneratedDirectory(generatedDir)
  emptyGeneratedDirectory(publicGeneratedDir)
  copyPublicAssets()

  const tags = loadItemTags()
  const recipes = loadRecipes(tags)
  const packMetadata = readJson<{
    filter?: { block?: PackFilterEntry[] }
  }>(resolve(packDir, 'pack.mcmeta'))
  const craftingPlanner = buildVanillaPlannerSupplement({
    minecraftVersion: project.minecraftVersion,
    vanillaFiles: vanillaAssets,
    packFilters: packMetadata.filter?.block ?? [],
    packRecipes: recipes,
    normalizeIngredient: value => normalizeIngredient(value, tags),
    stationName
  })
  const ingredientGlossary = buildIngredientGlossary(recipes, craftingPlanner)
  const variants = captureVariants()
  const extractedItems = buildItems(recipes, variants)
  const tradeGraph = loadActiveTradeGraph({ dataDir, rootDir })
  const traders = buildTraderViews({
    graph: tradeGraph,
    guides: traderGuideRegistry,
    items: extractedItems,
    parseStack,
    displayTitle: (stack, items) => (
      stackDisplayTitle(stack, resolveStackItem(items, stack))
    ),
    resultDetails: stackResultDetails,
    translateText: flattenText
  })
  attachItemRelations(extractedItems, recipes, traders)
  const advancements = loadAdvancements(extractedItems, recipes)
  const items = extractedItems.filter(isPlayerFacingItem)
  disambiguateItemTitles(items)
  items.sort(compareItems)
  const acquisition = buildAcquisitionCatalog({
    dataDir,
    sourceGuidesPath: resolve(rootDir, 'wiki-data/source-guides.ru.json'),
    items,
    ingredientGlossary,
    parseStack,
    vanillaNameForResource
  })
  attachAcquisitionGuides(acquisition.targets, items)
  replaceLegacyLootRelations(items, acquisition)
  const files = walkFiles(packDir)

  const catalog: WikiCatalog = {
    generatedAt: new Date().toISOString(),
    pack: {
      title: project.pack.title,
      version: project.pack.version,
      minecraft: project.minecraftVersion,
      sha256: hashTree(files)
    },
    stats: {
      files: files.length,
      items: items.length,
      customItems: items.filter(item => item.isCustom).length,
      recipes: recipes.length,
      advancements: advancements.length
    },
    ingredientGlossary,
    acquisition,
    traders,
    items,
    recipes,
    advancements
  }

  writeJson(resolve(generatedDir, 'catalog.json'), catalog)
  writeJson(resolve(generatedDir, 'crafting-planner.json'), craftingPlanner)
  writeJson(resolve(generatedDir, 'search-index.json'), createSearchIndex(catalog))
  writeJson(resolve(publicGeneratedDir, 'crafting-planner.json'), craftingPlanner)
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
    resolve(rootDir, 'wiki-data/project.json'),
    resolve(rootDir, 'wiki-data/vanilla-ru.json'),
    resolve(rootDir, 'wiki-data/advancement-guides.json'),
    resolve(rootDir, 'wiki-data/ingredient-guides.ru.json'),
    resolve(rootDir, 'wiki-data/item-guides.ru.json'),
    resolve(rootDir, 'wiki-data/acquisition-guides.ru.json'),
    resolve(rootDir, 'wiki-data/entity-guides.ru.json'),
    resolve(rootDir, 'wiki-data/source-guides.ru.json'),
    vanillaAssetsPath
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

  for (const path of Object.keys(vanillaAssets)
    .filter(path => /^data\/[^/]+\/tags\/item\/.+\.json$/.test(path))
    .sort((left, right) => left.localeCompare(right, 'en'))) {
    const [, namespace, , , ...nameParts] = path.split('/')
    mergeItemTag(
      directTags,
      `${namespace}:${nameParts.join('/').replace(/\.json$/, '')}`,
      readVanillaJson(path),
      namespace
    )
  }

  for (const path of walkFiles(dataDir, file => extname(file) === '.json' && normalizePath(file).includes('/tags/item/'))) {
    const relativePath = normalizePath(relative(dataDir, path))
    const [namespace, , , ...nameParts] = relativePath.split('/')
    const tagId = `${namespace}:${nameParts.join('/').replace(/\.json$/, '')}`
    mergeItemTag(directTags, tagId, readJson<JsonObject>(path), namespace)
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

function mergeItemTag(
  tags: Map<string, string[]>,
  tagId: string,
  data: JsonObject,
  namespace: string
): void {
  const values = Array.isArray(data.values) ? data.values : []
  const normalizedValues = values
    .map(value => typeof value === 'string' ? value : isObject(value) ? value.id : undefined)
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.startsWith('#')
      ? `#${normalizeResource(value.slice(1), namespace)}`
      : normalizeResource(value, namespace))
  const inherited = data.replace === true ? [] : tags.get(tagId) ?? []
  tags.set(tagId, [...inherited, ...normalizedValues])
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
    const smithingIngredients: SmithingIngredients = {}
    for (const role of smithingRequirementRoles) {
      if (data[role] !== undefined) {
        smithingIngredients[role] = normalizeIngredient(data[role], tags)
      }
    }

    let ingredients: IngredientView[]
    if (key && pattern) {
      const usedSymbols = [...new Set(pattern.join('').replaceAll(' ', '').split(''))]
      ingredients = usedSymbols.map(symbol => key[symbol]).filter(Boolean)
    } else if (Array.isArray(data.ingredients)) {
      ingredients = data.ingredients.map(value => normalizeIngredient(value, tags))
    } else if (data.ingredient !== undefined) {
      ingredients = [normalizeIngredient(data.ingredient, tags)]
    } else {
      ingredients = smithingRequirementRoles.flatMap((role) => {
        const ingredient = smithingIngredients[role]
        return ingredient ? [ingredient] : []
      })
    }

    const result = parseStack(data.result)
    const requirements = buildRecipeRequirements({
      type,
      pattern,
      key,
      ingredients,
      smithing: smithingIngredients
    })

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
      requirements,
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

    walkJson(data, undefined, (value, inheritedCarrier) => {
      if (!isObject(value) || !isObject(value.components)) {
        return
      }

      const ownCarrier = [value.id, value.name]
        .find(candidate => typeof candidate === 'string' && isResourceLocation(candidate))
      const carrier = typeof ownCarrier === 'string' ? ownCarrier : inheritedCarrier
      if (!carrier) {
        return
      }

      const rawModel = value.components['minecraft:item_model']
      const consumable = value.components['minecraft:consumable']
      const isComponentOnlyLootVariant = source.kind === 'loot'
        && isObject(consumable)
        && Array.isArray(consumable.on_consume_effects)
        && consumable.on_consume_effects.length > 0
      if (typeof rawModel !== 'string' && !isComponentOnlyLootVariant) {
        return
      }
      const model = typeof rawModel === 'string'
        ? normalizeModelId(rawModel)
        : normalizeModelId(carrier)

      const stack = parseStack({
        ...value,
        id: carrier,
        components: value.components
      })
      if (!stack) {
        return
      }

      const bucket = variants.get(model) ?? []
      const occurrence = { stack, source }
      const signature = JSON.stringify(occurrence)
      if (!bucket.some(candidate => JSON.stringify(candidate) === signature)) {
        bucket.push(occurrence)
      }
      variants.set(model, bucket)
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
        `block.minecraft.${modelPath.replaceAll('/', '.')}`,
        `item.minecraft.tipped_arrow.effect.${modelPath.replaceAll('/', '.')}`
      ])
    const name = itemGuideRegistry.itemNames[model]
      ?? (candidateNameKey
        ? translateKey(candidateNameKey)
        : richest?.name || nameForResource(model))
    const description = candidateNameKey
      ? firstTranslation([
          `${candidateNameKey}.desc`,
          `${candidateNameKey}.description`
        ])
      : undefined
    const recipeIds = recipes
      .filter(recipe => recipe.result?.model === model || (
        !recipe.result?.model
        && Object.keys(recipe.result?.components ?? {}).length === 0
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
      title: name,
      nameKey: candidateNameKey,
      description,
      icon: iconFor(carrier, model, components),
      category: itemCategory(modelPath, carrier, components),
      isCustom,
      lore: extractLore(components),
      enchantments: extractEnchantments(components),
      effects: extractEffects(components, carrier),
      attributes: extractAttributes(components),
      componentKeys: Object.keys(components).sort(),
      components,
      recipeIds,
      guide: itemGuideRegistry.entries[model],
      obtainedFrom: [],
      usedIn: [],
      recipeUses: [],
      sources,
      aliases: [...new Set([
        model,
        carrier,
        modelPath,
        richest?.name,
        en[candidateNameKey ?? ''] ?? ''
      ].filter(Boolean))]
    })
  }

  for (const output of buildRecipeOutputItems(recipes)) {
    const existing = items.find(item => (
      item.carrier === output.carrier
      && normalizeDisplayName(item.name) === normalizeDisplayName(output.name)
      && JSON.stringify([
        item.lore,
        item.enchantments,
        item.effects,
        item.attributes
      ]) === JSON.stringify([
        output.lore,
        output.enchantments,
        output.effects,
        output.attributes
      ])
    ))
    if (!existing) {
      items.push(output)
      continue
    }

    existing.recipeIds = [...new Set([
      ...existing.recipeIds,
      ...output.recipeIds
    ])]
    existing.sources = dedupeSources([
      ...existing.sources,
      ...output.sources
    ])
  }
  return items.sort(compareItems)
}

function buildRecipeOutputItems(recipes: RecipeView[]): ItemView[] {
  const groups = new Map<string, {
    stack: StackView
    recipes: RecipeView[]
  }>()

  for (const recipe of recipes) {
    const stack = recipe.result
    if (!stack || stack.model) {
      continue
    }

    const components = stack.components ?? {}
    const hasComponents = Object.keys(components).length > 0
    if (!hasComponents && !isRenamedRecipeResult(stack)) continue

    const signature = hasComponents
      ? JSON.stringify({
          carrier: stack.carrier,
          name: stack.name,
          nameKey: stack.nameKey,
          components
        })
      : JSON.stringify({
          carrier: stack.carrier,
          name: stack.name
        })
    const group = groups.get(signature) ?? { stack, recipes: [] }
    group.recipes.push(recipe)
    groups.set(signature, group)
  }

  return [...groups.values()].map(({ stack, recipes: matchingRecipes }) => {
    const orderedRecipes = [...matchingRecipes].sort((left, right) => left.id.localeCompare(right.id))
    const primaryRecipe = orderedRecipes[0]
    const components = stack.components ?? {}
    const hasComponents = Object.keys(components).length > 0
    const resultSlug = acquisitionTargetSlug(stack.name)
    const id = hasComponents
      ? `recipe-output:${primaryRecipe.namespace}/${primaryRecipe.path}`
      : `renamed-result:${resourceNamespace(stack.carrier)}/${resourcePath(stack.carrier)}/${resultSlug}`
    const description = stack.nameKey
      ? firstTranslation([
          `${stack.nameKey}.desc`,
          `${stack.nameKey}.description`
        ])
      : undefined

    return {
      id,
      slug: hasComponents ? slugify(id) : resultSlug,
      carrier: stack.carrier,
      name: stack.name,
      title: stack.name,
      nameKey: stack.nameKey,
      description,
      icon: stack.icon ?? iconFor(stack.carrier, undefined, components),
      category: itemCategory(resourcePath(stack.carrier), stack.carrier, components),
      isCustom: true,
      lore: extractLore(components),
      enchantments: extractEnchantments(components),
      effects: extractEffects(components, stack.carrier),
      attributes: extractAttributes(components),
      componentKeys: Object.keys(components).sort(),
      components,
      recipeIds: orderedRecipes.map(recipe => recipe.id),
      obtainedFrom: [],
      usedIn: [],
      recipeUses: [],
      sources: orderedRecipes.map(recipe => ({
        kind: 'recipe',
        label: `Рецепт: ${recipe.station}`,
        path: recipe.sourcePath
      })),
      aliases: [...new Set([
        id,
        stack.carrier,
        resourcePath(stack.carrier),
        vanillaNameForResource(stack.carrier),
        stack.name,
        stack.nameKey,
        en[stack.nameKey ?? ''],
        ...orderedRecipes.map(recipe => recipe.id)
      ].filter(Boolean))]
    }
  })
}

function isRenamedRecipeResult(stack: StackView): boolean {
  const vanillaName = vanillaNameForResource(stack.carrier)
  return Boolean(
    vanillaName
    && normalizeDisplayName(stack.name) !== normalizeDisplayName(vanillaName)
  )
}

function attachAcquisitionGuides(
  targets: WikiCatalog['acquisition']['targets'],
  items: ItemView[]
): void {
  const targetsBySlug = new Map(targets.map(target => [target.slug, target]))
  const staleGuides = Object.keys(acquisitionGuideRegistry.entries)
    .filter(slug => !targetsBySlug.has(slug))
  if (staleGuides.length) {
    throw new Error(
      `Гайды ссылаются на отсутствующие цели добычи: ${staleGuides.join(', ')}`
    )
  }

  const itemsBySlug = new Map(items.map(item => [item.slug, item]))
  for (const [slug, guide] of Object.entries(acquisitionGuideRegistry.entries)) {
    const target = targetsBySlug.get(slug)
    if (!target) continue

    target.guide = guide
    if (!target.itemSlug) continue

    const item = itemsBySlug.get(target.itemSlug)
    if (item) item.guide = guide
  }
}

function disambiguateItemTitles(items: ItemView[]): void {
  const groups = new Map<string, ItemView[]>()
  for (const item of items) {
    const group = groups.get(item.name) ?? []
    group.push(item)
    groups.set(item.name, group)
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue
    }

    const stations = group.map(item => (
      item.sources
        .find(source => source.kind === 'recipe')
        ?.label.replace(/^Рецепт:\s*/, '')
    ))
    const hasDistinctStations = stations.every(Boolean)
      && new Set(stations).size === group.length

    for (const item of group) {
      const station = item.sources
        .find(source => source.kind === 'recipe')
        ?.label.replace(/^Рецепт:\s*/, '')
      const qualifier = (hasDistinctStations ? station : undefined)
        ?? item.lore[0]
        ?? item.description
        ?? formatIdentifier(item.model ?? item.id)
      item.title = `${item.name}: ${qualifier}`
    }
  }
}

function isPlayerFacingItem(item: ItemView): boolean {
  const hasGameplaySource = item.sources.some(source => (
    source.kind === 'recipe'
    || source.kind === 'trade'
    || source.kind === 'loot'
  ))

  return Boolean(
    hasGameplaySource
    || item.guide
    || item.description
    || item.lore.length
    || item.effects.length
    || item.attributes.length
    || item.recipeIds.length
    || item.obtainedFrom.length
    || item.usedIn.length
  )
}

function compareItems(left: ItemView, right: ItemView): number {
  const customOrder = Number(right.isCustom) - Number(left.isCustom)
  return customOrder || left.title.localeCompare(right.title, 'ru')
}

function attachItemRelations(
  items: ItemView[],
  recipes: RecipeView[],
  traders: TraderView[]
): void {
  const knownItemIds = new Set(items.flatMap(item => [item.id, item.model].filter(Boolean)))
  const curatedItemIds = [
    ...Object.keys(itemGuideRegistry.entries),
    ...Object.keys(itemGuideRegistry.itemNames)
  ]
  const staleGuides = curatedItemIds
    .filter(id => !knownItemIds.has(id))
  if (staleGuides.length) {
    throw new Error(`Гайды ссылаются на отсутствующие предметы: ${staleGuides.join(', ')}`)
  }

  for (const item of items) {
    for (const recipe of recipes) {
      const matchingIngredients = recipe.ingredients.filter(ingredient => (
        ingredient.ids.includes(item.id)
        || (item.model !== undefined && ingredient.ids.includes(item.model))
        || ingredient.ids.includes(item.carrier)
      ))
      if (!matchingIngredients.length) {
        continue
      }

      const exactMatch = matchingIngredients.some(ingredient => (
        ingredient.ids.includes(item.id)
        || (item.model !== undefined && ingredient.ids.includes(item.model))
      ))
      item.recipeUses.push({
        recipeId: recipe.id,
        technical: !exactMatch || undefined
      })
    }
  }

  const trades = allTradeOffers(traders)
  for (const trade of trades) {
    const givenItem = resolveStackItem(items, trade.result.stack)
    const relation = tradeRelation(trade)

    for (const cost of trade.costs) {
      const wantedItem = resolveStackItem(items, cost.stack)
      if (!wantedItem) continue

      wantedItem.usedIn.push({
        kind: 'trade',
        title: trade.result.title,
        description: `${relation.context} принимает этот предмет.`,
        icon: trade.result.stack.icon,
        to: trade.to,
        ...relation,
        sourcePath: trade.sourcePath
      })
    }
    if (givenItem) {
      const costTitles = trade.costs.map(cost => `«${cost.title}»`).join(' + ')
      givenItem.obtainedFrom.push({
        kind: 'trade',
        title: `${trade.traderTitle}: обмен`,
        description: `${relation.context} попросит ${costTitles}.`,
        icon: trade.costs[0]?.stack.icon,
        to: trade.to,
        ...relation,
        sourcePath: trade.sourcePath
      })
    }
  }

  attachLootRelations(items)

  for (const item of items) {
    item.obtainedFrom = dedupeItemRelations(item.obtainedFrom)
    item.usedIn = dedupeItemRelations(item.usedIn)
    item.recipeUses = [...new Map(item.recipeUses.map(use => [
      use.recipeId,
      use
    ])).values()].sort((left, right) => left.recipeId.localeCompare(right.recipeId))
  }
}

function replaceLegacyLootRelations(
  items: ItemView[],
  acquisition: WikiCatalog['acquisition']
): void {
  const targetsByItemSlug = Map.groupBy(
    acquisition.targets.filter(target => target.itemSlug),
    target => target.itemSlug as string
  )
  const methodsByTargetId = Map.groupBy(
    acquisition.methods,
    method => method.targetId
  )
  const locationById = new Map(
    acquisition.locations.map(source => [source.id, source])
  )
  const mobById = new Map(
    acquisition.mobs.map(source => [source.id, source])
  )

  for (const item of items) {
    const targets = targetsByItemSlug.get(item.slug) ?? []
    if (!targets.length) continue

    const exactRelations = targets.flatMap(target => (
      (methodsByTargetId.get(target.id) ?? []).flatMap((method) => {
        const mob = mobById.get(method.sourceId)
        const location = locationById.get(method.sourceId)
        const source = mob ?? location
        if (!source) return []

        const notes = method.notes.map(note => note.text)
        return [{
          kind: 'loot' as const,
          title: source.name,
          description: [method.context, ...notes].join(' · '),
          icon: target.stack.icon,
          to: mob
            ? `/mobs/${mob.slug}`
            : `/locations/${location?.slug}`,
          sourcePath: method.sourcePath
        }]
      })
    ))

    item.obtainedFrom = dedupeItemRelations([
      ...item.obtainedFrom.filter(relation => relation.kind !== 'loot'),
      ...exactRelations
    ])
  }
}

function tradeRelation(
  trade: TradeOfferView
): Pick<
  ItemRelationView,
  'context' | 'contextDetail' | 'cost' | 'result' | 'details'
> & { context: string } {
  return {
    context: trade.traderTitle,
    contextDetail: trade.level ? `${trade.level}-й уровень` : undefined,
    cost: trade.costs,
    result: trade.result,
    details: trade.details.length ? trade.details : undefined
  }
}

function stackDisplayTitle(stack: StackView, item?: ItemView): string {
  const lore = extractLore(stack.components ?? {})
  const name = item?.name ?? stack.name
  if (stack.model === 'minecraft:application' && lore.length >= 2) {
    const age = lore[0].replace(/^Возраст:\s*/, '')
    const culture = lore[1].replace(/^Культура:\s*/, '')
    const origin = refugeeOrigins[culture]
    return origin
      ? `${name}: ${age} ${origin}`
      : culture === 'отсутствует'
        ? `${name}: ${age}`
        : `${name}: ${age}, культура — ${culture}`
  }

  return stackIdentityLoreCount(stack, lore) === 1
    ? `${name}: ${lore[0]}`
    : name
}

function stackResultDetails(stack: StackView): string[] {
  const lore = extractLore(stack.components ?? {})
  return [
    ...lore.slice(stackIdentityLoreCount(stack, lore)),
    ...stackEnchantments(stack)
  ]
}

function stackIdentityLoreCount(stack: StackView, lore: string[]): number {
  if (stack.model === 'minecraft:application' && lore.length >= 2) {
    return 2
  }
  if (!lore.length) {
    return 0
  }

  const modelPath = stack.model ? resourcePath(stack.model) : ''
  return identityLoreNameKeys.has(stack.nameKey ?? '')
    || modelPath.startsWith('blessing_')
    || modelPath.endsWith('_recipe')
    || modelPath === 'ofuda'
    ? 1
    : 0
}

function stackEnchantments(stack: StackView): string[] {
  return extractEnchantments(stack.components ?? {})
    .map(enchantment => `${enchantment.name} ${romanLevel(enchantment.level)}`)
}

function extractEnchantments(components: JsonObject): ItemEnchantment[] {
  const rawEnchantments = components['minecraft:stored_enchantments']
    ?? components['minecraft:enchantments']
  if (!isObject(rawEnchantments)) {
    return []
  }
  const levels = isObject(rawEnchantments.levels)
    ? rawEnchantments.levels
    : rawEnchantments
  return Object.entries(levels)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([id, level]) => {
      const normalized = normalizeResource(id)
      const name = enchantmentNames.get(normalized)
        ?? ru[`enchantment.${normalized.replace(':', '.')}`]
        ?? formatIdentifier(resourcePath(normalized))
      return {
        id: normalized,
        name,
        level,
        description: enchantmentDescriptions[normalized]
      }
    })
}

function loadEnchantmentNames(): Map<string, string> {
  const names = new Map<string, string>()
  for (const path of walkFiles(dataDir, file => extname(file) === '.json')) {
    const relativePath = normalizePath(relative(dataDir, path))
    const match = relativePath.match(/^([^/]+)\/enchantment\/(.+)\.json$/)
    if (!match) continue

    const definition = readJson<JsonObject>(path)
    const name = flattenText(definition.description)
    if (name) {
      names.set(`${match[1]}:${match[2]}`, name)
    }
  }
  return names
}

function romanLevel(level: number): string {
  const levels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return levels[level - 1] ?? String(level)
}

function attachLootRelations(items: ItemView[]): void {
  const lootTables = loadLootTableRecords()
  const recordsById = new Map(lootTables.map(record => [record.id, record]))
  const parentsByReference = new Map<string, string[]>()

  for (const record of lootTables) {
    for (const reference of record.references) {
      const parents = parentsByReference.get(reference) ?? []
      parents.push(record.id)
      parentsByReference.set(reference, parents)
    }
  }

  for (const item of items) {
    if (item.guide?.unobtainable) continue

    const directTableIds = item.sources
      .filter(source => source.kind === 'loot')
      .map(source => lootTableIdFromSourcePath(source.path))
      .filter((id): id is string => id !== undefined)
    const reachable = new Set(directTableIds)
    const queue = [...directTableIds]

    while (queue.length) {
      const current = queue.shift()
      if (!current) continue
      for (const parent of parentsByReference.get(current) ?? []) {
        if (reachable.has(parent)) continue
        reachable.add(parent)
        queue.push(parent)
      }
    }

    for (const tableId of reachable) {
      const record = recordsById.get(tableId)
      const relation = record ? lootRelation(record) : undefined
      if (relation) {
        item.obtainedFrom.push(relation)
      }
    }
  }
}

function loadLootTableRecords(): LootTableRecord[] {
  const records: LootTableRecord[] = []

  for (const path of walkFiles(dataDir, file => (
    extname(file) === '.json'
    && normalizePath(file).includes('/loot_table/')
  ))) {
    const sourcePath = normalizePath(relative(rootDir, path))
    const id = lootTableIdFromSourcePath(sourcePath)
    if (!id) continue

    const namespace = id.split(':')[0]
    const references = new Set<string>()
    walkJson(readJson<JsonValue>(path), undefined, (value) => {
      if (
        isObject(value)
        && value.type === 'minecraft:loot_table'
        && typeof value.value === 'string'
      ) {
        references.add(normalizeResource(value.value, namespace))
      }
    })
    records.push({
      id,
      sourcePath,
      references: [...references]
    })
  }

  return records
}

function lootTableIdFromSourcePath(sourcePath: string): string | undefined {
  const match = normalizePath(sourcePath)
    .match(/^pack\/data\/([^/]+)\/loot_table\/(.+)\.json$/)
  return match ? `${match[1]}:${match[2]}` : undefined
}

function lootRelation(record: LootTableRecord): ItemRelationView | undefined {
  const path = resourcePath(record.id)
  if (path.startsWith('chests/')) {
    const locationPath = path.slice('chests/'.length)
    if (locationPath.startsWith('equipment/')) {
      return undefined
    }
    const location = itemGuideRegistry.lootLocations[locationPath]
      ?? formatIdentifier(locationPath)
    return {
      kind: 'loot',
      title: location,
      description: 'Может встретиться в сундуках этой структуры.',
      sourcePath: record.sourcePath
    }
  }
  if (path.startsWith('entities/')) {
    const entity = path.slice('entities/'.length)
    return {
      kind: 'loot',
      title: `Добыча: ${entitySourceName(entity)}`,
      description: 'Предмет входит в таблицу добычи этого существа.',
      sourcePath: record.sourcePath
    }
  }
  if (path.startsWith('blocks/')) {
    const block = path.slice('blocks/'.length)
    return {
      kind: 'loot',
      title: `Добыча блока: ${nameForResource(`minecraft:${block}`)}`,
      description: 'Предмет может выпасть при разрушении этого блока.',
      sourcePath: record.sourcePath
    }
  }
  if (path.startsWith('gameplay/fishing')) {
    return {
      kind: 'loot',
      title: 'Рыбалка',
      description: 'Предмет можно выловить.',
      sourcePath: record.sourcePath
    }
  }
  if (path.startsWith('archaeology/')) {
    return {
      kind: 'loot',
      title: 'Археология',
      description: 'Предмет можно найти при раскопках подозрительного блока.',
      sourcePath: record.sourcePath
    }
  }
  return undefined
}

function dedupeItemRelations(relations: ItemRelationView[]): ItemRelationView[] {
  const order: Record<ItemRelationView['kind'], number> = {
    loot: 0,
    trade: 1,
    recipe: 2
  }
  return [...new Map(relations.map(relation => [
    relationPresentationKey(relation),
    relation
  ])).values()].sort((left, right) => (
    order[left.kind] - order[right.kind]
    || left.title.localeCompare(right.title, 'ru')
  ))
}

function relationPresentationKey(relation: ItemRelationView): string {
  const { sourcePath: _sourcePath, ...presentation } = relation
  return JSON.stringify(presentation)
}

function loadAssetItems(): AssetItem[] {
  const itemDir = resolve(assetsDir, 'items')
  if (!existsSync(itemDir)) {
    return []
  }

  return walkFiles(itemDir, file => extname(file) === '.json').map(path => {
    const idPath = normalizePath(relative(itemDir, path)).replace(/\.json$/, '')
    const id = `minecraft:${idPath}`

    return {
      id,
      model: normalizeModelId(id)
    }
  })
}

function loadAdvancements(items: ItemView[], recipes: RecipeView[]): AdvancementView[] {
  const advancementDir = resolve(dataDir, 'main/advancement')
  const advancements: AdvancementView[] = []
  const itemsByModel = new Map(
    items
      .filter((item): item is ItemView & { model: string } => item.model !== undefined)
      .map(item => [item.model, item])
  )
  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]))

  for (const path of walkFiles(advancementDir, file => extname(file) === '.json')) {
    const data = readJson<JsonObject>(path)
    if (!isObject(data.display)) {
      continue
    }

    const relativePath = normalizePath(relative(advancementDir, path)).replace(/\.json$/, '')
    const section = relativePath.includes('/') ? relativePath.split('/')[0] : 'other'
    const id = `main:${relativePath}`
    const icon = parseStack(data.display.icon) ?? {
      carrier: 'minecraft:knowledge_book',
      count: 1,
      name: 'Достижение',
      icon: iconFor('minecraft:knowledge_book')
    }

    advancements.push({
      id,
      slug: slugify(relativePath),
      section,
      parent: typeof data.parent === 'string' ? data.parent : undefined,
      title: flattenText(data.display.title) || formatIdentifier(relativePath),
      description: flattenText(data.display.description),
      icon,
      frame: typeof data.display.frame === 'string' ? data.display.frame : 'task',
      hidden: data.display.hidden === true,
      sourcePath: normalizePath(relative(rootDir, path)),
      guide: resolveAdvancementGuide(
        id,
        advancementGuideRegistry.entries[id],
        itemsByModel,
        recipesById
      )
    })
  }

  const advancementIds = new Set(advancements.map(advancement => advancement.id))
  const staleGuides = Object.keys(advancementGuideRegistry.entries)
    .filter(id => !advancementIds.has(id))
  if (staleGuides.length > 0) {
    throw new Error(`Гайды ссылаются на отсутствующие достижения: ${staleGuides.join(', ')}`)
  }

  return sortAdvancements(advancements)
}

function resolveAdvancementGuide(
  advancementId: string,
  raw: RawAdvancementGuide | undefined,
  itemsByModel: Map<string, ItemView>,
  recipesById: Map<string, RecipeView>
): AdvancementGuide | undefined {
  if (!raw) {
    return undefined
  }

  const entries: AdvancementGuide['entries'] = []
  for (const model of raw.itemModels ?? []) {
    const item = itemsByModel.get(model)
    if (!item) {
      throw new Error(`${advancementId}: не найден предмет гайда ${model}`)
    }
    entries.push({
      label: item.title,
      to: `/items/${item.slug}`
    })
  }
  for (const recipeId of raw.recipeIds ?? []) {
    const recipe = recipesById.get(recipeId)
    if (!recipe) {
      throw new Error(`${advancementId}: не найден рецепт гайда ${recipeId}`)
    }
    entries.push({
      label: recipe.result?.name ?? recipe.id,
      to: `/recipes/${recipe.namespace}/${recipe.path}`
    })
  }

  return {
    spoiler: raw.spoiler === true,
    note: raw.note,
    intendedPath: raw.intendedPath,
    exactCondition: raw.exactCondition,
    link: raw.link,
    entries,
    searchTerms: raw.searchTerms ?? []
  }
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
    ? ingredientGuideRegistry.tagNames[tag] ?? `Любой подходящий предмет`
    : formatIngredientAlternatives(uniqueIds.map(nameForResource))

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

function buildIngredientGlossary(
  recipes: RecipeView[],
  craftingPlanner: CraftingPlannerSupplement
): Record<string, IngredientGlossaryEntry> {
  const ids = new Set(recipes.flatMap(recipe => [
    ...recipe.ingredients.flatMap(ingredient => ingredient.ids),
    ...(recipe.result ? [recipe.result.carrier] : []),
    stationResourceForRecipe(recipe)
  ]).filter((id): id is string => Boolean(id)))
  for (const [resultId, resultRecipes] of Object.entries(craftingPlanner.recipesByResult)) {
    ids.add(resultId)
    for (const recipe of resultRecipes) {
      for (const requirement of recipe.requirements) {
        requirement.ingredient.ids.forEach(id => ids.add(id))
      }
      if (recipe.stationResourceId) ids.add(recipe.stationResourceId)
    }
  }
  const sourceIndex = collectIngredientSources(ids)

  return Object.fromEntries([...ids].sort().map((id) => {
    const automaticHint = describeIngredientSources(sourceIndex.get(id))
    return [id, {
      id,
      name: nameForResource(id),
      vanillaName: vanillaNameForResource(id),
      icon: iconFor(id),
      obtainHint: ingredientGuideRegistry.entries[id] ?? automaticHint,
      curated: ingredientGuideRegistry.entries[id] ? true : undefined
    }]
  }))
}

interface IngredientSources {
  entities: Set<string>
  blocks: Set<string>
  chests: boolean
  fishing: boolean
  archaeology: boolean
  trading: boolean
}

function collectIngredientSources(ids: Set<string>): Map<string, IngredientSources> {
  const result = new Map<string, IngredientSources>()
  const sourceFor = (id: string): IngredientSources => {
    const existing = result.get(id)
    if (existing) return existing
    const created = {
      entities: new Set<string>(),
      blocks: new Set<string>(),
      chests: false,
      fishing: false,
      archaeology: false,
      trading: false
    }
    result.set(id, created)
    return created
  }

  for (const path of walkFiles(dataDir, file => extname(file) === '.json')) {
    const sourcePath = normalizePath(relative(dataDir, path))
    const isLootTable = sourcePath.includes('/loot_table/')
    const isTrade = sourcePath.includes('/villager_trade/')
    if (!isLootTable && !isTrade) continue

    const data = readJson<JsonValue>(path)
    walkJson(data, undefined, (value) => {
      if (!isObject(value)) return
      const rawId = isLootTable && value.type === 'minecraft:item'
        ? value.name
        : isTrade
          ? value.id
          : undefined
      if (typeof rawId !== 'string') return

      const id = normalizeResource(rawId)
      if (!ids.has(id)) return
      const sources = sourceFor(id)
      if (isTrade) {
        sources.trading = true
        return
      }

      const entity = sourcePath.match(/\/loot_table\/entities\/(.+)\.json$/)
      const block = sourcePath.match(/\/loot_table\/blocks\/(.+)\.json$/)
      if (entity && isKnownLootEntity(entity[1])) {
        sources.entities.add(entitySourceName(entity[1]))
      }
      else if (block) sources.blocks.add(nameForResource(`minecraft:${block[1]}`))
      else if (sourcePath.includes('/loot_table/chests/')) sources.chests = true
      else if (sourcePath.includes('/loot_table/gameplay/fishing')) sources.fishing = true
      else if (sourcePath.includes('/loot_table/archaeology/')) sources.archaeology = true
    })
  }

  return result
}

function describeIngredientSources(
  sources?: IngredientSources
): string | undefined {
  const clauses: string[] = []
  const entities = [...(sources?.entities ?? [])].slice(0, 3)
  const blocks = [...(sources?.blocks ?? [])].slice(0, 3)

  if (entities.length) clauses.push(`Выпадает из: ${entities.join(', ')}`)
  if (blocks.length) clauses.push(`Добывается из блоков: ${blocks.join(', ')}`)
  if (sources?.fishing) clauses.push('Можно выловить')
  return clauses.length ? `${clauses.join('. ')}.` : undefined
}

function entitySourceName(id: string): string {
  const normalized = normalizeResource(id)
  const curated = sourceGuideRegistry.mobs[normalized]?.name
  if (curated) {
    return curated.toLocaleLowerCase('ru-RU')
  }

  const spawnEgg = vanillaRu.entries[
    `item.minecraft.${resourcePath(normalized).replaceAll('/', '.')}_spawn_egg`
  ]
  return spawnEgg?.replace(/^Яйцо призыва /, '').toLocaleLowerCase('ru-RU')
    ?? formatIdentifier(normalized).toLocaleLowerCase('ru-RU')
}

function isKnownLootEntity(id: string): boolean {
  const normalized = normalizeResource(id)
  return Boolean(
    sourceGuideRegistry.mobs[normalized]
    || vanillaRu.entries[
      `item.minecraft.${resourcePath(normalized).replaceAll('/', '.')}_spawn_egg`
    ]
  )
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
    icon: iconFor(carrier, model, components),
    components
  }
}

function extractLore(components: JsonObject): string[] {
  const lore = components['minecraft:lore']
  return Array.isArray(lore)
    ? lore.map(flattenText).filter(Boolean)
    : []
}

function extractEffects(components: JsonObject, carrier: string): ItemEffect[] {
  const result: ItemEffect[] = []
  const seen = new Set<string>()
  const durationScale = carrier === 'minecraft:tipped_arrow' ? 1 / 8 : 1
  const appendEffect = (effect: JsonObject, scale = 1) => {
    if (typeof effect.id !== 'string') return

    const id = normalizeResource(effect.id)
    const path = resourcePath(id)
    const durationSeconds = typeof effect.duration === 'number'
      ? Math.round(effect.duration * scale / 20)
      : 0
    const itemEffect: ItemEffect = {
      id,
      name: effectNames[path] ?? ru[`effect.minecraft.${path}`] ?? formatIdentifier(path),
      level: typeof effect.amplifier === 'number' ? effect.amplifier + 1 : 1,
      durationSeconds
    }
    const signature = JSON.stringify(itemEffect)
    if (seen.has(signature)) return

    seen.add(signature)
    result.push(itemEffect)
  }

  const potionContents = components['minecraft:potion_contents']
  if (isObject(potionContents)) {
    if (typeof potionContents.potion === 'string') {
      const potionPath = resourcePath(normalizeResource(potionContents.potion))
      for (const effect of vanillaPotionEffects[potionPath] ?? []) {
        appendEffect(effect, durationScale)
      }
    }

    if (Array.isArray(potionContents.custom_effects)) {
      for (const effect of potionContents.custom_effects) {
        if (isObject(effect)) appendEffect(effect, durationScale)
      }
    }
  }

  const consumable = components['minecraft:consumable']
  if (!isObject(consumable) || !Array.isArray(consumable.on_consume_effects)) {
    return result
  }

  for (const action of consumable.on_consume_effects) {
    if (!isObject(action)) continue

    if (action.type === 'minecraft:clear_all_effects') {
      result.push({
        id: 'minecraft:clear_all_effects',
        name: 'Снимает все активные эффекты',
        level: 1,
        durationSeconds: null
      })
      continue
    }

    if (action.type === 'minecraft:remove_effects' && Array.isArray(action.effects)) {
      const removedEffectNames = action.effects.flatMap((effect) => {
        if (typeof effect !== 'string') return []
        const path = resourcePath(normalizeResource(effect))
        return [effectNames[path] ?? ru[`effect.minecraft.${path}`] ?? formatIdentifier(path)]
      })
      if (removedEffectNames.length) {
        result.push({
          id: 'minecraft:remove_effects',
          name: 'Снимает вредные эффекты',
          description: removedEffectNames.join(', '),
          level: 1,
          durationSeconds: null
        })
      }
      continue
    }

    if (action.type === 'minecraft:teleport_randomly') {
      const diameter = typeof action.diameter === 'number' ? action.diameter : 16
      const radius = String(diameter / 2).replace('.', ',')
      result.push({
        id: 'minecraft:teleport_randomly',
        name: 'Случайная телепортация',
        description: `Перемещает в случайное безопасное место в пределах ${radius} блоков.`,
        level: 1,
        durationSeconds: null
      })
      continue
    }

    if (!Array.isArray(action.effects)) continue

    for (const effect of action.effects) {
      if (isObject(effect)) appendEffect(effect)
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

function iconFor(
  carrier: string,
  model?: string,
  components: JsonObject = {}
): string | undefined {
  if (model) {
    const modelTexture = textureForItemDefinition(model, components)
      ?? textureForModel(model)
    if (modelTexture) {
      return modelTexture
    }
  }

  const specialPreview = specialPreviewForItem(carrier)
  if (specialPreview) {
    return specialPreview
  }

  const carrierTexture = textureForItemDefinition(carrier, components)
  if (carrierTexture) {
    return carrierTexture
  }

  const normalizedCarrier = normalizeResource(carrier)
  const path = resourcePath(normalizedCarrier)
  const blockModelTexture = textureForModel(
    `${resourceNamespace(normalizedCarrier)}:block/${path}`
  )
  if (blockModelTexture) {
    return blockModelTexture
  }

  for (const type of ['item', 'block']) {
    const texture = publicTexture(`${resourceNamespace(normalizedCarrier)}:${type}/${path}`)
    if (texture) {
      return texture
    }
  }

  return undefined
}

function textureForItemDefinition(
  item: string,
  components: JsonObject = {}
): string | undefined {
  const normalized = normalizeModelId(item)
  const path = resourcePath(normalized)
  const definition = readAssetJson(`items/${path}.json`)
  const model = definition
    ? firstModelReference(definition.model, components)
    : undefined
  return model ? textureForModel(model) : undefined
}

function firstModelReference(
  value: unknown,
  components: JsonObject = {}
): string | undefined {
  if (typeof value === 'string') {
    return normalizeResource(value)
  }
  if (!isObject(value)) {
    return undefined
  }
  if (typeof value.model === 'string') {
    return normalizeResource(value.model)
  }

  if (
    typeof value.type === 'string'
    && value.type.replace(/^minecraft:/, '') === 'select'
    && typeof value.property === 'string'
    && value.property.replace(/^minecraft:/, '') === 'custom_model_data'
    && Array.isArray(value.cases)
  ) {
    const customModelData = components['minecraft:custom_model_data']
    const selectedValues = isObject(customModelData) && Array.isArray(customModelData.strings)
      ? customModelData.strings.filter((entry): entry is string => typeof entry === 'string')
      : []
    const selectedCase = value.cases.find(entry => {
      if (!isObject(entry)) {
        return false
      }
      const expected = Array.isArray(entry.when) ? entry.when : [entry.when]
      return expected.some(candidate =>
        typeof candidate === 'string' && selectedValues.includes(candidate)
      )
    })
    const selectedModel = isObject(selectedCase)
      ? firstModelReference(selectedCase.model, components)
      : undefined
    if (selectedModel) {
      return selectedModel
    }
  }

  for (const key of ['fallback', 'on_false', 'on_true', 'base']) {
    const nested = firstModelReference(value[key], components)
    if (nested) {
      return nested
    }
  }

  for (const key of ['models', 'entries', 'cases']) {
    const collection = value[key]
    if (!Array.isArray(collection)) {
      continue
    }
    for (const entry of collection) {
      const nested = firstModelReference(
        isObject(entry) && entry.model !== undefined ? entry.model : entry,
        components
      )
      if (nested) {
        return nested
      }
    }
  }

  return undefined
}

function specialPreviewForItem(item: string): string | undefined {
  const path = resourcePath(item)
  const banner = path.match(/^(.+)_banner$/)
  if (banner && bannerColours[banner[1]]) {
    return writeSpecialPreview(path, `
      <rect width="32" height="32" fill="none"/>
      <rect x="8" y="2" width="3" height="28" fill="#5b432d"/>
      <rect x="10" y="3" width="17" height="20" fill="#151515"/>
      <path d="M11 4h15v17h-4v3h-4v-3h-7z" fill="${bannerColours[banner[1]]}"/>
      <path d="M11 4h15v3H11zm0 14h11v3H11z" fill="#fff" opacity=".18"/>
    `)
  }

  if (path === 'chest' || path === 'trapped_chest') {
    const metal = path === 'trapped_chest' ? '#a43f32' : '#d9aa36'
    return writeSpecialPreview(path, `
      <path d="M4 7h24v19H4z" fill="#2a1a0f"/>
      <path d="M6 9h20v6H6zm0 9h20v6H6z" fill="#9a5b2d"/>
      <path d="M6 9h20v2H6zm0 9h20v2H6z" fill="#c77a38"/>
      <rect x="14" y="14" width="5" height="7" fill="#3b2a18"/>
      <rect x="15" y="15" width="3" height="4" fill="${metal}"/>
    `)
  }

  if (path === 'shield') {
    return writeSpecialPreview(path, `
      <path d="M5 3h22v16h-3v5h-4v4h-8v-4H8v-5H5z" fill="#24180f"/>
      <path d="M8 6h16v12h-3v5h-3v3h-4v-3h-3v-5H8z" fill="#8a5a32"/>
      <path d="M10 8h12v3H10zm0 5h12v3H10z" fill="#b07a47"/>
    `)
  }

  const copper = path.match(/^(?:(exposed|weathered|oxidized)_)?copper_golem_statue$/)
  if (copper) {
    const colour = {
      exposed: '#c77b55',
      weathered: '#5f9e82',
      oxidized: '#4f8f78'
    }[copper[1] ?? ''] ?? '#c8794f'
    return writeSpecialPreview(path, `
      <rect x="10" y="3" width="12" height="9" fill="#2b1e18"/>
      <rect x="11" y="4" width="10" height="7" fill="${colour}"/>
      <rect x="8" y="13" width="16" height="9" fill="#2b1e18"/>
      <rect x="10" y="14" width="12" height="7" fill="${colour}"/>
      <rect x="5" y="14" width="4" height="10" fill="${colour}"/>
      <rect x="23" y="14" width="4" height="10" fill="${colour}"/>
      <rect x="10" y="22" width="5" height="7" fill="${colour}"/>
      <rect x="18" y="22" width="5" height="7" fill="${colour}"/>
      <rect x="13" y="6" width="2" height="2" fill="#f3d479"/>
      <rect x="18" y="6" width="2" height="2" fill="#f3d479"/>
    `)
  }

  return undefined
}

function writeSpecialPreview(id: string, body: string): string {
  const fileName = `${slugify(id)}.svg`
  const target = resolve(publicGeneratedDir, `previews/${fileName}`)
  if (!existsSync(target)) {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(
      target,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${body}</svg>`
    )
  }
  return `/generated/previews/${fileName}`
}

function textureForModel(model: string): string | undefined {
  const normalized = normalizeResource(model)
  const path = resourcePath(normalized)
  const modelPath = /^(?:block|item)\//.test(path) ? path : `item/${path}`
  const textures = collectModelTextures(
    `${resourceNamespace(normalized)}:${modelPath}`,
    new Set<string>()
  )
  for (const key of ['layer0', 'front', 'all', 'side', 'top', 'end', 'particle', 'bottom']) {
    const reference = resolveTextureReference(textures[key], textures)
    if (!reference) {
      continue
    }
    const texture = publicTexture(reference)
    if (texture) {
      return texture
    }
  }

  for (const reference of Object.values(textures)) {
    const resolvedReference = resolveTextureReference(reference, textures)
    if (!resolvedReference) {
      continue
    }
    const texture = publicTexture(resolvedReference)
    if (texture) {
      return texture
    }
  }

  return publicTexture(`${resourceNamespace(normalized)}:${modelPath}`)
}

function collectModelTextures(
  model: string,
  seen: Set<string>
): Record<string, string> {
  const normalized = normalizeResource(model)
  if (seen.has(normalized)) {
    return {}
  }
  seen.add(normalized)

  const data = readAssetJson(`models/${resourcePath(normalized)}.json`)
  if (!data) {
    return {}
  }

  const inherited = typeof data.parent === 'string'
    ? collectModelTextures(normalizeResource(data.parent), seen)
    : {}
  const own = isObject(data.textures)
    ? Object.fromEntries(
        Object.entries(data.textures)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      )
    : {}
  return { ...inherited, ...own }
}

function resolveTextureReference(
  reference: string | undefined,
  textures: Record<string, string>,
  seen = new Set<string>()
): string | undefined {
  if (!reference) {
    return undefined
  }
  if (!reference.startsWith('#')) {
    return normalizeResource(reference)
  }

  const key = reference.slice(1)
  if (seen.has(key)) {
    return undefined
  }
  seen.add(key)
  return resolveTextureReference(textures[key], textures, seen)
}

function readAssetJson(path: string): JsonObject | undefined {
  const packPath = resolve(packDir, `assets/minecraft/${path}`)
  if (existsSync(packPath)) {
    return readJson<JsonObject>(packPath)
  }

  return readVanillaJson(`assets/minecraft/${path}`)
}

function readVanillaJson(path: string): JsonObject | undefined {
  if (vanillaJson.has(path)) {
    return vanillaJson.get(path)
  }

  const source = vanillaAssets[path]
  if (!source) {
    return undefined
  }

  const value = JSON.parse(Buffer.from(source).toString('utf8')) as JsonObject
  vanillaJson.set(path, value)
  return value
}

function publicTexture(reference: string): string | undefined {
  const normalized = normalizeResource(reference)
  const namespace = resourceNamespace(normalized)
  if (namespace !== 'minecraft') {
    return undefined
  }

  const path = resourcePath(normalized)
  const source = resolve(packDir, `assets/${namespace}/textures/${path}.png`)
  if (existsSync(source)) {
    return `/generated/textures/${path}.png`
  }

  const vanillaSource = vanillaAssets[`assets/${namespace}/textures/${path}.png`]
  if (!vanillaSource) {
    return undefined
  }

  const target = resolve(publicGeneratedDir, `textures/${path}.png`)
  if (!existsSync(target)) {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, vanillaSource)
  }
  return `/generated/textures/${path}.png`
}

function nameForResource(resource: string): string {
  const path = resourcePath(resource).replaceAll('/', '.')
  return firstTranslation([
    `item.kleispack.${path}`,
    `item.minecraft.${path}`,
    `block.minecraft.${path}`
  ]) ?? formatIdentifier(resource)
}

function vanillaNameForResource(resource: string): string | undefined {
  const path = resourcePath(resource).replaceAll('/', '.')
  return [
    `item.minecraft.${path}`,
    `block.minecraft.${path}`
  ].map(key => vanillaRu.entries[key]).find(Boolean)
}

function normalizeDisplayName(value: string): string {
  return value
    .replace(/§[0-9a-fk-or]/gi, '')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .trim()
}

function firstTranslation(keys: string[]): string | undefined {
  const key = firstTranslationKey(keys)
  return key ? translateKey(key) : undefined
}

function firstTranslationKey(keys: string[]): string | undefined {
  return keys.find(key => ru[key] !== undefined || en[key] !== undefined)
}

function translateKey(key: string): string {
  return ru[key] ?? runtimeRu[key] ?? en[key] ?? formatIdentifier(key)
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

function validateCatalog(catalog: WikiCatalog): void {
  const missingIcons: string[] = []
  const itemSlugs = new Set<string>()
  const itemTitles = new Set<string>()
  for (const item of catalog.items) {
    if (itemSlugs.has(item.slug)) {
      throw new Error(`Повторяющийся slug предмета: ${item.slug}`)
    }
    itemSlugs.add(item.slug)
    if (itemTitles.has(item.title)) {
      throw new Error(`Неоднозначный заголовок предмета: ${item.title}`)
    }
    itemTitles.add(item.title)
    if (!item.icon) {
      missingIcons.push(`предмет ${item.id}`)
    } else {
      validatePublicIcon(item.icon, `предмет ${item.id}`)
    }
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
    if (recipe.result) {
      if (!recipe.result.icon) {
        missingIcons.push(`результат ${recipe.id}`)
      } else {
        validatePublicIcon(recipe.result.icon, `результат ${recipe.id}`)
      }
    }
    for (const ingredient of recipe.ingredients) {
      if (ingredient.icons.length === 0) {
        missingIcons.push(`ингредиент ${ingredient.tag ?? ingredient.ids.join(', ')} в ${recipe.id}`)
      } else {
        for (const icon of ingredient.icons) {
          validatePublicIcon(icon, `ингредиент в ${recipe.id}`)
        }
      }
    }
  }

  if (missingIcons.length > 0) {
    throw new Error(
      `Каталог содержит ${missingIcons.length} слотов без иконок:\n`
      + missingIcons.slice(0, 30).map(value => `- ${value}`).join('\n')
    )
  }

  if (catalog.stats.files < 4_000 || catalog.stats.recipes < 900 || catalog.stats.items < 200) {
    throw new Error(`Каталог подозрительно мал: ${JSON.stringify(catalog.stats)}`)
  }
}

function validatePublicIcon(icon: string, context: string): void {
  const prefix = '/generated/'
  if (!icon.startsWith(prefix)) {
    throw new Error(`Некорректный путь иконки ${icon}: ${context}`)
  }

  const path = resolve(publicGeneratedDir, icon.slice(prefix.length))
  if (!path.startsWith(`${publicGeneratedDir}${sep}`) || !existsSync(path)) {
    throw new Error(`Иконка ${icon} не существует: ${context}`)
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
