import type {
  CraftingPlanState,
  CraftingTargetView
} from '../../types/crafting'
import type { CraftingGraphDemand } from '../../types/craftingGraph'
import { normalizeCount } from './internal'

export function itemDetail(
  demand: CraftingGraphDemand,
  status: CraftingPlanState,
  target: CraftingTargetView
): string {
  if (status === 'cycle') {
    return 'Выбранный путь возвращается к этому предмету.'
  }
  if (demand.missing === 0) {
    return 'Уже готово.'
  }
  const hasRecipeAndSource = status === 'craft'
    && Boolean(target.sources?.length)
  if (status === 'obtain' && target.obtainHint) {
    return target.obtainHint
  }
  if (status === 'unknown') {
    return 'Надёжный способ получения пока не найден.'
  }
  if (demand.owned > 0) {
    if (hasRecipeAndSource) return 'Осталось изготовить или найти.'
    return status === 'craft'
      ? 'Осталось изготовить.'
      : 'Осталось получить.'
  }
  if (hasRecipeAndSource) return 'Можно изготовить или найти.'
  return status === 'craft'
    ? 'Можно изготовить.'
    : 'Получить одним из способов ниже.'
}

export function recipeDetail(
  batchesValue: number,
  resultCountValue: number,
  surplusValue: number
): string {
  const batches = normalizeCount(batchesValue)
  const resultCount = Math.max(1, normalizeCount(resultCountValue))
  const produced = batches * resultCount
  const surplus = normalizeCount(surplusValue)

  if (batches < 1 || (batches === 1 && resultCount === 1)) return ''

  const parts = batches > 1
    ? [`Повторить ${batches} ${repeatWord(batches)}`]
    : []
  if (produced > 1) parts.push(`получится ${produced}`)
  if (surplus > 0) parts.push(`останется ${surplus}`)
  return `${parts.join(', ')}.`
}

function repeatWord(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'раз'
  if (last >= 2 && last <= 4) return 'раза'
  return 'раз'
}
