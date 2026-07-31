import type { ItemRelationView } from '../types/wiki'
import { stripMinecraftFormatting } from './format'
import { russianWordForm } from './russianGrammar'

export function describeItemUses(
  uses: readonly ItemRelationView[]
): string {
  const recipes = uses.filter(use => use.kind === 'recipe')
  const trades = uses.filter(use => use.kind === 'trade')
  const sentences: string[] = []

  if (recipes.length) {
    sentences.push(
      `Используется в ${recipes.length} ${russianWordForm(
        recipes.length,
        ['рецепте', 'рецептах', 'рецептах']
      )}${relationExamples(recipes)}`
    )
  }
  if (trades.length) {
    sentences.push(
      `Принимается в ${trades.length} ${russianWordForm(
        trades.length,
        ['обмене', 'обменах', 'обменах']
      )} с жителями${relationExamples(trades)}`
    )
  }

  return sentences.map(sentence => `${sentence}.`).join(' ')
}

function relationExamples(relations: readonly ItemRelationView[]): string {
  const titles = [...new Set(relations.map(relation => (
    stripMinecraftFormatting(relation.title).trim()
  )))]
    .filter(Boolean)
  if (!titles.length) return ''

  const shown = titles.slice(0, 3)
  const remaining = titles.length - shown.length
  return ` — ${shown.join(', ')}${remaining ? ` и ещё ${remaining}` : ''}`
}
