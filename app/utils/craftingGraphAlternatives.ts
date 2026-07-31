import type {
  CraftingGraphAlternativeOption,
  CraftingGraphAlternativesNode
} from '../types/craftingGraph'

export const CRAFTING_GRAPH_VISIBLE_ALTERNATIVE_LIMIT = 8

export function visibleCraftingAlternatives(
  node: CraftingGraphAlternativesNode
): readonly CraftingGraphAlternativeOption[] {
  if (node.options.length <= CRAFTING_GRAPH_VISIBLE_ALTERNATIVE_LIMIT) {
    return node.options
  }

  const visible = node.options.slice(0, CRAFTING_GRAPH_VISIBLE_ALTERNATIVE_LIMIT)
  const selected = node.options.find(option => option.selected)
  if (!selected || visible.includes(selected)) return visible

  return [...visible.slice(0, -1), selected]
}

export function hiddenCraftingAlternativeCount(
  node: CraftingGraphAlternativesNode
): number {
  return node.options.length - visibleCraftingAlternatives(node).length
}
