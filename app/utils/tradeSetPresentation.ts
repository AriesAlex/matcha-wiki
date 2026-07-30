import type { TradeSetView } from '../types/entities'

const biomeConditionPattern = /^Только в .+ биомах$/

export function tradeSetSelectionNote(set: TradeSetView): string {
  if (!set.offers.length) return ''

  const hasBiomeVariants = set.offers.some(offer => (
    offer.conditions.some(condition => biomeConditionPattern.test(condition))
  ))
  if (hasBiomeVariants) {
    return `При получении уровня житель получает до ${set.amount} подходящих сделок. `
      + 'Учитываются только варианты с пометкой его биома; '
      + 'варианты для остальных групп биомов не конкурируют с ними.'
  }

  if (set.amount >= set.offers.length) return ''
  return `При появлении торговца игра выберет ${set.amount} `
    + `из ${set.offers.length} вариантов.`
}
