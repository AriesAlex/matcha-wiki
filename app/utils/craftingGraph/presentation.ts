import type {
  CraftingPlanNode,
  CraftingPlanState
} from '../../types/crafting'
import type {
  CraftingGraphDemand,
  CraftingGraphMethodKind
} from '../../types/craftingGraph'
import { stripMinecraftFormatting } from '../format'
import { normalizeCount } from './internal'

export function itemDetail(
  demand: CraftingGraphDemand,
  status: CraftingPlanState
): string {
  if (status === 'cycle') {
    return `Нужно ${demand.required}; выбранный путь возвращается к этому предмету`
  }
  if (demand.missing === 0) {
    return `Есть все ${demand.required}`
  }

  const parts = [`Нужно ${demand.required}`]
  if (demand.owned > 0) parts.push(`есть ${demand.owned}`)
  parts.push(`осталось ${demand.missing}`)
  if (demand.batches > 0) {
    parts.push(`${demand.batches} ${pluralizeBatch(demand.batches)}`)
  }
  return parts.join(' · ')
}

export function methodTitle(
  kind: CraftingGraphMethodKind,
  planNode: CraftingPlanNode
): string {
  if (kind === 'recipe') {
    return stripMinecraftFormatting(planNode.recipe?.station ?? 'Изготовление')
  }
  if (kind === 'cycle') return 'Путь по кругу'
  if (kind === 'unknown') return 'Нужна разведка'
  return 'Найти или добыть'
}

export function methodDetail(
  kind: CraftingGraphMethodKind,
  planNode: CraftingPlanNode
): string {
  if (kind === 'recipe') {
    const batches = normalizeCount(planNode.batches)
    const resultCount = Math.max(1, normalizeCount(planNode.resultCount))
    return `${batches} ${pluralizeBatch(batches)} · по ${resultCount} за раз`
  }
  if (kind === 'cycle') {
    return 'Этот способ требует тот же предмет выше по цепочке'
  }
  if (kind === 'unknown') {
    return 'Надёжный способ получения пока не найден'
  }
  return planNode.target.obtainHint
    ?? 'Точный источник пока не описан'
}

function pluralizeBatch(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'подходов'
  if (last === 1) return 'подход'
  if (last >= 2 && last <= 4) return 'подхода'
  return 'подходов'
}
