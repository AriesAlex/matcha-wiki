import type { ItemRelationView, ItemView } from '../types/wiki'
import { describeItemUses } from './relationSummary'

export function getItemPurposeSummary(
  item: ItemView,
  uses: readonly ItemRelationView[] = []
): string {
  if (item.guide?.summary) return item.guide.summary

  if (item.carrier === 'minecraft:enchanted_book') {
    if (item.enchantments.length === 1) {
      return 'В этой книге хранится одно зачарование — соедините её с подходящим предметом на наковальне, и чары перейдут на него.'
    }
    if (item.enchantments.length > 1) {
      return 'В этой книге хранится несколько зачарований — при соединении с предметом на наковальне на него перейдут лишь те чары, что ему подходят.'
    }
  }
  if (item.enchantments.length) {
    return 'Предмет уже зачарован. Все чары и их уровни указаны ниже.'
  }
  if (item.effects.length) {
    return 'Даёт эффекты при использовании. Их сила и длительность указаны ниже.'
  }
  if (item.attributes.length) {
    return 'Снаряжение со своими боевыми или защитными характеристиками. Точные значения указаны ниже.'
  }

  const usageSummary = describeItemUses(uses)
  if (usageSummary) return usageSummary

  return getSafeItemFallback(item)
}

const portableAnimalEntities = new Set([
  'minecraft:axolotl',
  'minecraft:chicken',
  'minecraft:cow',
  'minecraft:pig',
  'minecraft:sheep'
])

function getSafeItemFallback(item: ItemView): string {
  const entityData = getComponentObject(item, 'minecraft:entity_data')
  if (
    entityData?.id === 'minecraft:item'
    && isRecord(entityData.Item)
    && typeof entityData.Item.count === 'number'
  ) {
    return `Торговая партия материалов: нажмите по земле, чтобы выгрузить сразу ${entityData.Item.count} единицы.`
  }

  if (
    item.id !== 'minecraft:application'
    && item.carrier.endsWith('_spawn_egg')
    && typeof entityData?.id === 'string'
    && portableAnimalEntities.has(entityData.id)
  ) {
    return 'При использовании по земле выпускает сохранённое в предмете существо.'
  }

  if (
    item.carrier === 'minecraft:bundle'
    && Array.isArray(item.components['minecraft:bundle_contents'])
  ) {
    return 'Хранит заранее собранный набор предметов и помогает переносить его в одном слоте инвентаря.'
  }

  if (
    item.components['minecraft:jukebox_playable'] !== undefined
    || resourcePath(item.carrier).startsWith('music_disc_')
  ) {
    return 'Музыкальная пластинка — вставьте её в проигрыватель, чтобы услышать записанную композицию.'
  }

  if (
    item.carrier === 'minecraft:item_frame'
    && entityData?.Invisible === true
  ) {
    return 'Невидимая рамка для декора: после установки виден только помещённый в неё предмет.'
  }

  if (item.carrier === 'minecraft:compass') {
    return 'Работает как обычный компас: в Верхнем мире указывает на точку возрождения мира, а после привязки к магниту — на него.'
  }

  if (isCopperChain(item.carrier)) {
    return 'Декоративная цепь для подвесов и деталей построек.'
  }

  if (item.carrier === 'minecraft:minecart') {
    return 'Вагонетка для перевозки игрока по рельсам.'
  }

  if (item.carrier === 'minecraft:soul_campfire') {
    return 'Костёр с синим огнём: готовит еду, даёт дымовой сигнал и отпугивает пиглинов.'
  }

  if (
    item.carrier === 'minecraft:flint_and_steel'
    && item.model === 'minecraft:tinder'
    && item.components['minecraft:max_damage'] === 1
  ) {
    return 'Одноразовый трут для розжига огня и костров.'
  }

  return getEquipmentFallback(item) || getBlockFallback(item.carrier)
}

function getBlockFallback(carrier: string): string {
  const path = resourcePath(carrier)
  if (path === 'furnace') {
    return 'Духовая печь плавит руды и готовит обычные печные рецепты на топливе.'
  }
  if (path === 'smoker') {
    return 'Саманная печь — ранняя станция для выплавки меди, обжига кирпичей и других стартовых материалов.'
  }
  if (path === 'brewing_stand') {
    return 'Лабораторный штатив служит рабочим местом Химика, который продаёт метательные зелья.'
  }
  if (path === 'target') {
    return 'Медный глаз подаёт редстоун-сигнал, когда в него попадает стрела или другой снаряд.'
  }
  if (path === 'redstone_block') {
    return 'Постоянный источник редстоун-сигнала для механизмов; его можно передвигать поршнями.'
  }
  if (path === 'redstone_lamp') {
    return 'Декоративный светильник, который загорается от редстоун-сигнала.'
  }
  if (
    path.endsWith('froglight')
    || path === 'sea_lantern'
    || path === 'end_rod'
  ) {
    return 'Светящийся декоративный блок для освещения построек.'
  }
  if (
    path.includes('bricks')
    || path.endsWith('_fence')
    || path === 'dark_prismarine'
  ) {
    return 'Декоративный строительный блок.'
  }

  return ''
}

function getEquipmentFallback(item: ItemView): string {
  const roles = getMiningRoles(item)
  const carrierPath = resourcePath(item.carrier)
  if (roles.has('pickaxe') && roles.has('axe')) {
    return 'Совмещает кирку и топор: добывает камень, руду и древесину одним инструментом.'
  }
  if (roles.has('hoe') && roles.has('shovel')) {
    return 'Совмещает мотыгу и лопату: обрабатывает грядки и быстро копает рыхлые блоки.'
  }
  if (roles.has('pickaxe') || carrierPath.endsWith('_pickaxe')) {
    return 'Кирка для добычи камня, руды и других твёрдых блоков.'
  }
  if (roles.has('axe') || carrierPath.endsWith('_axe')) {
    return 'Топор для быстрой рубки древесины; в бою также служит тяжёлым оружием.'
  }
  if (roles.has('shovel') || carrierPath.endsWith('_shovel')) {
    return 'Лопата для быстрой добычи земли, песка, гравия и других рыхлых блоков.'
  }
  if (roles.has('hoe') || carrierPath.endsWith('_hoe')) {
    return 'Мотыга для подготовки грядок и быстрой добычи подходящих растительных блоков.'
  }

  if (carrierPath.endsWith('_sword')) {
    return 'Оружие ближнего боя для быстрых рубящих атак.'
  }
  if (carrierPath === 'bow' || carrierPath.endsWith('_bow')) {
    return 'Дальнобойное оружие: натяните тетиву и выпустите стрелу.'
  }
  if (carrierPath === 'crossbow') {
    return 'Дальнобойное оружие, которое можно заранее зарядить стрелой или фейерверком.'
  }
  if (carrierPath === 'trident') {
    return 'Оружие для ближнего боя и метания.'
  }
  if (carrierPath === 'mace') {
    return 'Тяжёлое оружие ближнего боя, особенно сильное при ударе после падения.'
  }
  if (carrierPath === 'shield') {
    return 'Щит для блокирования атак и снарядов.'
  }
  if (carrierPath === 'spear' || carrierPath.endsWith('_spear')) {
    return 'Древковое оружие ближнего боя.'
  }
  if (carrierPath === 'brush') {
    return 'Кисть для археологических раскопок: очищает подозрительные блоки и извлекает находки.'
  }
  if (carrierPath === 'shears') {
    return 'Ножницы для стрижки овец и аккуратного сбора листвы, паутины и других хрупких блоков.'
  }
  if (/_(helmet|chestplate|leggings|boots)$/.test(carrierPath)) {
    return 'Часть комплекта брони: наденьте её в подходящий слот экипировки.'
  }
  if (item.components['minecraft:equippable'] !== undefined) {
    return 'Элемент экипировки: наденьте его в подходящий слот.'
  }

  return ''
}

function getMiningRoles(item: ItemView): Set<string> {
  const tool = getComponentObject(item, 'minecraft:tool')
  const rules = Array.isArray(tool?.rules) ? tool.rules : []
  const roles = new Set<string>()

  for (const rule of rules) {
    if (!isRecord(rule)) continue
    const blocks = typeof rule.blocks === 'string' ? [rule.blocks] : rule.blocks
    if (!Array.isArray(blocks)) continue
    for (const block of blocks) {
      if (typeof block !== 'string') continue
      const match = block.match(/^#minecraft:mineable\/(pickaxe|axe|shovel|hoe)$/)
      if (match?.[1]) roles.add(match[1])
    }
  }

  return roles
}

function getComponentObject(item: ItemView, key: string): Record<string, unknown> | undefined {
  const value = item.components[key]
  return isRecord(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function resourcePath(id: string): string {
  return id.includes(':') ? id.slice(id.indexOf(':') + 1) : id
}

function isCopperChain(id: string): boolean {
  return /^(waxed_)?(?:(?:exposed|weathered|oxidized)_)?copper_chain$/.test(resourcePath(id))
}
