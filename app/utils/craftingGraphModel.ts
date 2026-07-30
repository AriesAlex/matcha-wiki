import type { CraftingPlanNode } from '../types/crafting'
import type { CraftingGraphModel } from '../types/craftingGraph'
import { accumulateCraftingGraph } from './craftingGraph/accumulate'
import { finalizeCraftingGraph } from './craftingGraph/finalize'
import { collectProjection } from './craftingGraph/projection'

export function buildCraftingGraph(root: CraftingPlanNode): CraftingGraphModel {
  const projection = collectProjection(root)
  const { context, rootId } = accumulateCraftingGraph(root, projection)
  return finalizeCraftingGraph(context, rootId)
}
