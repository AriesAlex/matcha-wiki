import type {
  IngredientGlossaryEntry,
  IngredientView
} from '../types/wiki'

export function formatIngredientAlternatives(names: string[]): string {
  const cleanNames = names
    .map(name => name.trim())
    .filter(Boolean)
  const uniqueNames = [...new Set(cleanNames)]
  const firstName = uniqueNames[0]

  if (!firstName) return 'Особый ингредиент'
  if (uniqueNames.length === 1) {
    return cleanNames.length > 1
      ? `${firstName} — любой вариант`
      : firstName
  }
  if (uniqueNames.length <= 3) return uniqueNames.join(' или ')

  const hiddenCount = uniqueNames.length - 2
  return `${uniqueNames.slice(0, 2).join(', ')} или ещё ${hiddenCount} ${variantWord(hiddenCount)}`
}

export function explainIngredient(
  ingredient: IngredientView,
  glossary: Record<string, IngredientGlossaryEntry>
): string {
  const entries = ingredient.ids
    .map(id => glossary[id])
    .filter(entry => entry !== undefined)
  const renamed = unique(entries
    .filter(entry => entry.vanillaName && entry.vanillaName !== entry.name)
    .map(entry => (
      `${entry.name} в обычном Minecraft выглядит как ${entry.vanillaName}`
    )))
  const hints = unique(entries
    .map(entry => entry.obtainHint)
    .filter((hint): hint is string => Boolean(hint)))

  if (ingredient.ids.length > 1) {
    const showsSharedHint = ingredient.ids.length <= 3 && hints.length === 1
    const details = [
      `Подойдёт любой из ${ingredient.ids.length} вариантов.`,
      ...(renamed.length === 1 ? renamed : []),
      ...(showsSharedHint
        ? hints
        : ['Выбирайте тот, который уже есть или проще получить.'])
    ]
    return details.map(withPeriod).join(' ')
  }

  return [...renamed, ...hints].map(withPeriod).join(' ')
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function withPeriod(value: string): string {
  return /[.!?]$/u.test(value) ? value : `${value}.`
}

function variantWord(count: number): string {
  const lastTwoDigits = count % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'вариантов'

  const lastDigit = count % 10
  if (lastDigit === 1) return 'вариант'
  if (lastDigit >= 2 && lastDigit <= 4) return 'варианта'
  return 'вариантов'
}
