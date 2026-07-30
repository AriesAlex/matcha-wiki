import type { AcquisitionTarget } from '../../../app/types/acquisition'

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya'
}

export function assignAcquisitionTargetSlugs(
  targets: AcquisitionTarget[],
  reservedItemSlugs: Iterable<string>
): AcquisitionTarget[] {
  const reserved = new Set(reservedItemSlugs)
  const stackTargets = targets.filter(target => !target.itemSlug)
  const targetsByBase = Map.groupBy(stackTargets, target => target.slug)
  const targetsByName = Map.groupBy(
    stackTargets,
    target => normalizeTitle(target.stack.name)
  )

  return targets.map((target) => {
    if (target.itemSlug) {
      return {
        ...target,
        slug: target.itemSlug
      }
    }

    const collides = reserved.has(target.slug)
      || (targetsByBase.get(target.slug)?.length ?? 0) > 1
    const sameName = targetsByName.get(normalizeTitle(target.stack.name)) ?? []
    const title = sameName.length > 1
      ? `${target.stack.name}: ${variantQualifier(target)}`
      : target.stack.name
    if (!collides) {
      return {
        ...target,
        title
      }
    }

    return {
      ...target,
      title,
      slug: `${target.slug}-${identitySuffix(target.id)}`
    }
  })
}

export function acquisitionTargetSlug(name: string): string {
  const transliterated = [...name.toLocaleLowerCase('ru-RU')]
    .map(character => CYRILLIC_TO_LATIN[character] ?? character)
    .join('')
  const slug = transliterated
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'nahodka'
}

function identitySuffix(id: string): string {
  return id.replace(/^.*:/, '').slice(0, 7)
}

function normalizeTitle(value: string): string {
  return value
    .replace(/§[0-9a-fk-or]/gi, '')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .trim()
}

function variantQualifier(target: AcquisitionTarget): string {
  const maximumStackSize = target.stack.components?.['minecraft:max_stack_size']
  if (typeof maximumStackSize === 'number') {
    return `стопка до ${maximumStackSize}`
  }
  if (target.stack.components?.['minecraft:lore']) {
    return 'с особым описанием'
  }
  if (!Object.keys(target.stack.components ?? {}).length) {
    return 'обычный вариант'
  }
  return `особый вариант ${identitySuffix(target.id)}`
}
