import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { WikiCatalog } from '../app/types/wiki'
import {
  acquisitionTargetSources,
  acquisitionTargetSummary,
  acquisitionTargetUses
} from '../app/utils/acquisitionTarget'
import { getItemPurposeSummary } from '../app/utils/itemPresentation'
import { playerFacingItemRecipeUses } from '../app/utils/itemRelations'

const catalog = JSON.parse(readFileSync(
  resolve(import.meta.dirname, '..', 'generated', 'catalog.json'),
  'utf8'
)) as WikiCatalog

describe('player-facing item purpose', () => {
  it('gives every generated item page a player-facing purpose', () => {
    const missing = catalog.items.flatMap((item) => {
      const uses = [
        ...item.usedIn,
        ...playerFacingItemRecipeUses(catalog, item)
      ]
      return getItemPurposeSummary(item, uses).trim()
        ? []
        : [`${item.slug}: ${item.title}`]
    })

    expect(missing).toEqual([])
  })

  it('puts Adamant usage into its summary instead of hiding it below the map', () => {
    const adamant = catalog.acquisition.targets.find(target => (
      target.slug === 'adamantovyy-splav'
    ))
    expect(adamant).toBeDefined()
    if (!adamant) return

    const uses = acquisitionTargetUses(catalog, adamant)
    expect(uses).toHaveLength(13)
    expect(acquisitionTargetSummary(adamant, uses)).toContain(
      'Используется в 13 рецептах — Адамантовая долабра, Адамантовая кирка, Адамантовая лопата и ещё 10.'
    )
  })

  it('shows trades that sell acquisition-only resources', () => {
    const stableVoid = catalog.acquisition.targets.find(target => (
      target.slug === 'stabilnaya-pustota-72f01b1'
    ))
    expect(stableVoid).toBeDefined()
    if (!stableVoid) return

    const trades = acquisitionTargetSources(catalog, stableVoid)
      .filter(source => source.kind === 'trade')
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({
      title: 'Глашатай',
      context: 'Глашатай'
    })
  })

  it('uses curated purpose text for acquisition targets without recipe usage', () => {
    const expected = {
      'blok-obolov': 'Компактное хранилище валюты',
      golovastik: 'Используйте у воды',
      'karta-zarytogo-klada': 'идите к красному кресту',
      'kristallizovannyy-estus': 'Светящийся строительный блок',
      lyagushka: 'предмет одноразовый',
      'syroy-estus': 'Регенерацию V на 2 секунды',
      meshok: 'переносное хранилище на 27 слотов',
      'semena-pomidorov': 'выращивать помидоры'
    }

    expect(catalog.items.find(item => (
      item.model === 'minecraft:enchanted_golden_apple'
    ))?.guide?.summary).toContain('8 сердец Поглощения')

    for (const [slug, phrase] of Object.entries(expected)) {
      const target = catalog.acquisition.targets.find(candidate => candidate.slug === slug)
      expect(target, slug).toBeDefined()
      if (!target) continue

      expect(target.guide?.summary, slug).toContain(phrase)
      expect(acquisitionTargetSummary(target, []), slug).toContain(phrase)
      expect(acquisitionTargetSummary(target, []), slug).not.toContain(
        'Реальный ресурс из таблиц добычи'
      )
    }
  })

  it('creates pages for every renamed plain recipe result without importing vanilla wholesale', () => {
    const expectedNewPages = [
      ['minecraft:nether_bricks', 'Адские кирпичи'],
      ['minecraft:nether_star', 'Божественная милость'],
      ['minecraft:allium', 'Гиацинт'],
      ['minecraft:furnace', 'Духовая печь'],
      ['minecraft:nether_brick_fence', 'Забор из адского кирпича'],
      ['minecraft:verdant_froglight', 'Зеленеющая люминофорная лампа'],
      ['minecraft:petrified_oak_slab', 'Земляная плита'],
      ['minecraft:stone', 'Известняк'],
      ['minecraft:end_stone_bricks', 'Коричневый песчаник'],
      ['minecraft:red_nether_bricks', 'Красные адские кирпичи'],
      ['minecraft:brewing_stand', 'Лабораторный штатив'],
      ['minecraft:glow_ink_sac', 'Люминофор'],
      ['minecraft:end_rod', 'Люминофорный стержень'],
      ['minecraft:prismarine', 'Малахит'],
      ['minecraft:prismarine_bricks', 'Малахитовые кирпичи'],
      ['minecraft:sea_lantern', 'Малахитовый фонарь'],
      ['minecraft:target', 'Медный глаз'],
      ['minecraft:ochre_froglight', 'Охристая люминофорная лампа'],
      ['minecraft:pearlescent_froglight', 'Перламутровая люминофорная лампа'],
      ['minecraft:smoker', 'Саманная печь'],
      ['minecraft:shulker_shell', 'Сплав сякудо'],
      ['minecraft:resin_brick', 'Стальной сплав'],
      ['minecraft:dark_prismarine', 'Тёмный малахит'],
      ['minecraft:redstone_lamp', 'Электрическая лампа'],
      ['minecraft:redstone_block', 'Электрический блок'],
      ['minecraft:redstone_torch', 'Электрический инвертор'],
      ['minecraft:redstone', 'Электрический провод'],
      ['minecraft:heart_of_the_sea', 'Электрумовый сплав']
    ] as const

    for (const [carrier, name] of expectedNewPages) {
      expect(catalog.items.find(item => (
        item.carrier === carrier && item.name === name
      )), `${carrier}: ${name}`).toBeDefined()
    }

    const renamedResults = catalog.items.filter(item => (
      item.id.startsWith('renamed-result:')
    ))
    expect(new Set(renamedResults.map(item => item.slug)).size)
      .toBe(renamedResults.length)
    expect(catalog.items.some(item => (
      item.id.startsWith('renamed-result:')
      && item.carrier === 'minecraft:oak_planks'
    ))).toBe(false)
  })

  it('shows the real downstream recipes for generated material pages', () => {
    const cases = [
      ['minecraft:resin_brick', 'Стальной сплав', 34],
      ['minecraft:redstone', 'Электрический провод', 19],
      ['minecraft:shulker_shell', 'Сплав сякудо', 13],
      ['minecraft:heart_of_the_sea', 'Электрумовый сплав', 13]
    ] as const

    for (const [carrier, name, useCount] of cases) {
      const item = catalog.items.find(candidate => (
        candidate.carrier === carrier && candidate.name === name
      ))
      expect(item, name).toBeDefined()
      if (!item) continue

      expect(playerFacingItemRecipeUses(catalog, item), name).toHaveLength(useCount)
    }
  })

  it('does not invent a warning when only carrier-level recipes match', () => {
    const avesta = catalog.items.find(item => item.model === 'minecraft:avesta')
    expect(avesta).toBeDefined()
    if (!avesta) return

    expect(getItemPurposeSummary({
      ...avesta,
      guide: undefined,
      usedIn: [],
      recipeUses: [{ recipeId: 'blessings:hell_bound_book', technical: true }]
    })).toBe('')
  })

  it('explains unambiguous intermediate materials through their real recipes', () => {
    const benzene = catalog.items.find(item => (
      item.id === 'recipe-output:crafting/benzene'
    ))
    expect(benzene).toBeDefined()
    if (!benzene) return

    const uses = playerFacingItemRecipeUses(catalog, benzene)
    expect(getItemPurposeSummary(benzene, uses)).toBe(
      'Используется в 2 рецептах — Книга адских уз, Стабилизированный эстус.'
    )
  })

  it('does not advertise orphaned future fishing loot as obtainable', () => {
    for (const model of ['minecraft:blind_cave_fish', 'minecraft:blind_minnow']) {
      const item = catalog.items.find(candidate => candidate.model === model)
      expect(item, model).toBeDefined()
      if (!item) continue

      expect(item.guide?.unobtainable, model).toBe(true)
      expect(item.obtainedFrom, model).toEqual([])
    }
  })

  it('does not treat every matching vanilla carrier as the same acquisition resource', () => {
    const obol = catalog.acquisition.targets.find(target => target.slug === 'obol')
    expect(obol).toBeDefined()
    if (!obol) return

    const recipes = acquisitionTargetUses(catalog, obol)
      .filter(use => use.kind === 'recipe')
    expect(recipes.map(use => use.title)).toEqual([
      'Благословение: Молитва святому Клименту'
    ])
  })

  it('explains how to use blessing enchantments instead of exposing internals', () => {
    const blessing = catalog.items.find(item => (
      item.model === 'minecraft:blessing_apollo'
    ))
    expect(blessing).toBeDefined()
    if (!blessing) return

    expect(blessing.enchantments).toEqual([
      { id: 'minecraft:impaling', name: 'Пронзатель', level: 3 },
      { id: 'minecraft:piercing', name: 'Пронзающая стрела', level: 2 }
    ])
    expect(getItemPurposeSummary(blessing)).toBe(
      'В этой книге хранится несколько зачарований — при соединении с предметом на наковальне на него перейдут лишь те чары, что ему подходят.'
    )

    const adamantPickaxe = catalog.items.find(item => (
      item.id === 'recipe-output:smithing_table/adamant_pickaxe'
    ))
    expect(adamantPickaxe).toBeDefined()
    if (!adamantPickaxe) return
    expect(getItemPurposeSummary(adamantPickaxe)).toBe(
      'Предмет уже зачарован. Все чары и их уровни указаны ниже.'
    )
  })

  it('explains portable animals without treating technical spawn-egg carriers as creatures', () => {
    const axolotl = catalog.items.find(item => item.id === 'minecraft:axolotl')
    const application = catalog.items.find(item => item.id === 'minecraft:application')
    const bedrockBuster = catalog.items.find(item => item.id === 'minecraft:bedrock_buster')
    expect(axolotl).toBeDefined()
    expect(application).toBeDefined()
    expect(bedrockBuster).toBeDefined()
    if (!axolotl || !application || !bedrockBuster) return

    expect(fallbackSummary(axolotl)).toBe(
      'При использовании по земле выпускает сохранённое в предмете существо.'
    )
    expect(fallbackSummary(application)).toBe('')
    expect(fallbackSummary(bedrockBuster)).toBe('')
  })

  it('explains containers, music and decorative utility items from their components', () => {
    const cases = [
      ['minecraft:mushy_bundle', 'Хранит заранее собранный набор предметов и помогает переносить его в одном слоте инвентаря.'],
      ['minecraft:music_disc_golden', 'Музыкальная пластинка — вставьте её в проигрыватель, чтобы услышать записанную композицию.'],
      ['minecraft:invisible_item_frame', 'Невидимая рамка для декора: после установки виден только помещённый в неё предмет.'],
      ['minecraft:golden_compass', 'Работает как обычный компас: в Верхнем мире указывает на точку возрождения мира, а после привязки к магниту — на него.'],
      ['minecraft:waxed_copper_chain', 'Декоративная цепь для подвесов и деталей построек.'],
      ['minecraft:tinder', 'Одноразовый трут для розжига огня и костров.'],
      ['minecraft:andesite', 'Торговая партия материалов: нажмите по земле, чтобы выгрузить сразу 64 единицы.']
    ] as const

    for (const [id, summary] of cases) {
      const item = catalog.items.find(candidate => candidate.id === id)
      expect(item, id).toBeDefined()
      if (item) expect(fallbackSummary(item), id).toBe(summary)
    }
  })

  it('describes ordinary equipment and hybrid tools without guessing numeric stats', () => {
    const cases = [
      ['recipe-output:crafting/diamond_pickaxe', 'Кирка для добычи камня, руды и других твёрдых блоков.'],
      ['minecraft:copper_mattock', 'Совмещает мотыгу и лопату: обрабатывает грядки и быстро копает рыхлые блоки.'],
      ['recipe-output:crafting/diamond_sword', 'Оружие ближнего боя для быстрых рубящих атак.'],
      ['recipe-output:crafting/diamond_boots', 'Часть комплекта брони: наденьте её в подходящий слот экипировки.'],
      ['recipe-output:crafting/wooden_spear', 'Древковое оружие ближнего боя.'],
      ['minecraft:archaeologists_brush', 'Кисть для археологических раскопок: очищает подозрительные блоки и извлекает находки.'],
      ['minecraft:copper_shears', 'Ножницы для стрижки овец и аккуратного сбора листвы, паутины и других хрупких блоков.']
    ] as const

    for (const [id, summary] of cases) {
      const item = catalog.items.find(candidate => candidate.id === id)
      expect(item, id).toBeDefined()
      if (item) expect(fallbackSummary(item), id).toBe(summary)
    }
  })

  it('covers ordinary transport and fire utilities without relying on a title', () => {
    const tinder = catalog.items.find(item => item.id === 'minecraft:tinder')
    expect(tinder).toBeDefined()
    if (!tinder) return

    expect(fallbackSummary({
      ...tinder,
      id: 'test:minecart',
      carrier: 'minecraft:minecart',
      model: undefined,
      components: {}
    })).toBe('Вагонетка для перевозки игрока по рельсам.')
    expect(fallbackSummary({
      ...tinder,
      id: 'test:soul-campfire',
      carrier: 'minecraft:soul_campfire',
      model: undefined,
      components: {}
    })).toBe(
      'Костёр с синим огнём: готовит еду, даёт дымовой сигнал и отпугивает пиглинов.'
    )
  })

  it('explains renamed stations, mechanisms and decorative blocks', () => {
    const expected = {
      'duhovaya-pech': 'Духовая печь плавит руды',
      'samannaya-pech': 'ранняя станция',
      'laboratornyy-shtativ': 'рабочим местом Химика',
      'mednyy-glaz': 'подаёт редстоун-сигнал',
      'elektricheskiy-blok': 'Постоянный источник редстоун-сигнала',
      'elektricheskaya-lampa': 'загорается от редстоун-сигнала',
      'malahitovyy-fonar': 'Светящийся декоративный блок',
      'krasnye-adskie-kirpichi': 'Декоративный строительный блок'
    }

    for (const [slug, phrase] of Object.entries(expected)) {
      const item = catalog.items.find(candidate => candidate.slug === slug)
      expect(item, slug).toBeDefined()
      if (item) expect(fallbackSummary(item), slug).toContain(phrase)
    }
  })
})

function fallbackSummary(item: WikiCatalog['items'][number]): string {
  return getItemPurposeSummary({
    ...item,
    guide: undefined,
    enchantments: [],
    effects: [],
    attributes: []
  })
}
