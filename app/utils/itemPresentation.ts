import type { ItemView } from '../types/wiki'

export function getItemPurposeSummary(item: ItemView): string {
  if (item.guide?.summary) return item.guide.summary

  const tradeCount = item.usedIn.filter(relation => relation.kind === 'trade').length
  const recipeCount = item.recipeUses.filter(use => !use.technical).length

  if (tradeCount && recipeCount) {
    return `Нужен для ${formatRelationCount(tradeCount, 'обмена', 'обменов')} с жителями и ${formatRelationCount(recipeCount, 'рецепта', 'рецептов')}.`
  }
  if (tradeCount) {
    return `Нужен для ${formatRelationCount(tradeCount, 'обмена', 'обменов')} с жителями.`
  }
  if (recipeCount) {
    return `Нужен для ${formatRelationCount(recipeCount, 'рецепта', 'рецептов')}.`
  }

  const ordinaryRecipeCount = item.recipeUses.filter(use => use.technical).length
  if (ordinaryRecipeCount) {
    return `Отдельного применения у этого варианта не найдено. Осторожно: верстак может принять его вместо обычного предмета в ${formatRelationCount(ordinaryRecipeCount, 'рецепте', 'рецептах')}.`
  }
  if (item.effects.length) {
    return 'Даёт эффекты при использовании. Их сила и длительность указаны ниже.'
  }
  if (item.attributes.length) {
    return 'Снаряжение со своими боевыми или защитными характеристиками. Точные значения указаны ниже.'
  }

  return 'Отдельное применение в рецептах и торговле пока не найдено. Ниже собраны известные способы получения и сведения из пака.'
}

function formatRelationCount(count: number, singular: string, plural: string): string {
  const usesSingular = count % 10 === 1 && count % 100 !== 11
  return `${count} ${usesSingular ? singular : plural}`
}
