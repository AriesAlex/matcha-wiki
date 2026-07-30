import type {
  CraftingIndex,
  CraftingPlanNode,
  CraftingPlanSelections,
  CraftingRecipeView,
  CraftingTargetView
} from '../types/crafting'
import {
  targetForResource,
  targetsForIngredient
} from './craftingIndex'

interface BuildOptions {
  maxDepth?: number
}

interface BuildContext {
  index: CraftingIndex
  selections: CraftingPlanSelections
  inventory: Map<string, number>
  plannedStations: Set<string>
  maxDepth: number
}

export function buildCraftingPlan(
  index: CraftingIndex,
  target: CraftingTargetView,
  requiredCount: number,
  selections: CraftingPlanSelections,
  ownedByTarget: Record<string, number>,
  options: BuildOptions = {}
): CraftingPlanNode {
  const inventory = new Map(
    Object.entries(ownedByTarget)
      .map(([key, value]) => [key, normalizeCount(value)] as const)
      .filter(([, value]) => value > 0)
  )

  return buildNode({
    index,
    selections,
    inventory,
    plannedStations: new Set(),
    maxDepth: options.maxDepth ?? 18
  }, target, normalizeRequiredCount(requiredCount), [], 0)
}

export function recipeChoiceKey(
  target: CraftingTargetView,
  recipeId: string,
  requirementId: string
): string {
  return `${target.key}|${recipeId}|${requirementId}`
}

function buildNode(
  context: BuildContext,
  target: CraftingTargetView,
  requiredCount: number,
  ancestry: string[],
  depth: number,
  consumeOwned = true
): CraftingPlanNode {
  const storedCount = context.inventory.get(target.key) ?? 0
  const ownedCount = Math.min(storedCount, requiredCount)
  const missingCount = requiredCount - ownedCount
  if (consumeOwned) {
    context.inventory.set(target.key, storedCount - ownedCount)
  }

  const recipeOptions = context.index.recipesByTarget.get(target.key) ?? []
  const base = {
    id: `${ancestry.join('>')}|${target.key}`,
    target,
    requiredCount,
    ownedCount,
    missingCount,
    recipeOptions,
    batches: 0,
    resultCount: 1,
    requirements: []
  }

  if (missingCount === 0) {
    return { ...base, state: 'owned' }
  }

  if (ancestry.includes(target.key)) {
    return { ...base, state: 'cycle' }
  }

  const selectedMode = context.selections.modeByTarget[target.key]
  if (selectedMode === 'obtain') {
    return { ...base, state: 'obtain' }
  }

  const selectedRecipeId = context.selections.recipeByTarget[target.key]
  const recipe = chooseRecipe(
    recipeOptions,
    target,
    selectedRecipeId,
    context.index.preferredRecipeByTarget.get(target.key)
  )
  if (!recipe || depth >= context.maxDepth) {
    return {
      ...base,
      state: target.kind === 'resource' || target.obtainHint
        ? 'obtain'
        : 'unknown'
    }
  }

  const resultCount = recipe.resultCount
  const batches = Math.ceil(missingCount / resultCount)
  const nextAncestry = [...ancestry, target.key]
  const branchContext = forkBuildContext(context)
  const station = buildStationNode(
    branchContext,
    recipe,
    nextAncestry,
    depth + 1
  )
  const requirements = recipe.requirements.map((requirement) => {
    const options = targetsForIngredient(context.index.catalog, requirement.ingredient)
    const choiceKey = recipeChoiceKey(target, recipe.id, requirement.id)
    const selectedOptionKey = context.selections.optionByRequirement[choiceKey]
    const selectedTarget = options.find(option => option.key === selectedOptionKey)
      ?? options[0]
      ?? {
        key: `resource:unknown:${requirement.id}`,
        kind: 'resource' as const,
        resourceId: requirement.ingredient.label,
        title: requirement.ingredient.label
      }
    const count = requirement.count * batches

    return {
      id: choiceKey,
      role: requirement.role,
      count,
      label: requirement.ingredient.label,
      options,
      selectedOptionKey: selectedTarget.key,
      node: buildNode(
        branchContext,
        selectedTarget,
        count,
        nextAncestry,
        depth + 1
      )
    }
  })

  const plan: CraftingPlanNode = {
    ...base,
    state: 'craft',
    recipe,
    batches,
    resultCount,
    station,
    requirements
  }
  const explicitlyCrafting = selectedMode === 'craft' || Boolean(selectedRecipeId)
  if (
    !explicitlyCrafting
    && hasKnownSource(target)
    && containsCycle(plan)
  ) {
    return { ...base, state: 'obtain' }
  }

  commitBuildContext(context, branchContext)
  return plan
}

function buildStationNode(
  context: BuildContext,
  recipe: CraftingRecipeView,
  ancestry: string[],
  depth: number
): CraftingPlanNode | undefined {
  if (!recipe.stationResourceId) return undefined

  const target = targetForResource(
    context.index.catalog,
    recipe.stationResourceId
  )
  if (ancestry.includes(target.key)) {
    return buildNode(context, target, 1, ancestry, depth, false)
  }
  if (context.plannedStations.has(target.key)) return undefined

  context.plannedStations.add(target.key)
  return buildNode(context, target, 1, ancestry, depth, false)
}

function chooseRecipe(
  recipes: CraftingRecipeView[],
  target: CraftingTargetView,
  selectedRecipeId: string | undefined,
  preferredRecipeId: string | undefined
): CraftingRecipeView | undefined {
  const selected = recipes.find(recipe => recipe.id === selectedRecipeId)
  if (selected) return selected

  const preferred = recipes.find(recipe => recipe.id === preferredRecipeId)
  if (preferred) return preferred

  const best = [...recipes].sort((left, right) => (
    recipeScore(left, target) - recipeScore(right, target)
    || left.id.localeCompare(right.id)
  ))[0]
  return best && recipeScore(best, target) >= 1_000
    ? undefined
    : best
}

function recipeScore(
  recipe: CraftingRecipeView,
  target: CraftingTargetView
): number {
  const kind = recipe.type.replace(/^.*:/, '')
  const selfReference = recipe.requirements.some(requirement => (
    requirement.ingredient.ids.includes(target.resourceId)
  ))
  const recycling = /from_(?:blasting|smelting)_.+_materials|recycl|reclaim|scrap|разбор/i
    .test(recipe.id)
  const reverseConversion = /from_(?:stonecutting_)?[^:]*?(?:slabs?|stairs?|materials)(?:$|_)/i
    .test(recipe.id)
  const rawWoodRecovery = kind === 'stonecutting'
    && /_(?:log|stem)$/.test(target.resourceId)
  const storageUnitFromBlock = /^(?:minecraft:)?(?:amethyst_shard|bamboo|bone_meal|coal|copper_ingot|diamond|dried_kelp|emerald|gold_ingot|honeycomb|iron_ingot|lapis_lazuli|netherite_ingot|nether_quartz|quartz|raw_copper|raw_gold|raw_iron|redstone|resin_clump|slime_ball|wheat)$/
    .test(target.resourceId)
  const blockUnpacking = storageUnitFromBlock
    && recipe.resultCount > 1
    && recipe.requirements.length === 1
    && (recipe.requirements.at(0)?.ingredient.ids
      .some(id => id.endsWith('_block')) ?? false)

  return Number(selfReference) * 10_000
    + Number(recycling) * 2_000
    + Number(reverseConversion || rawWoodRecovery || blockUnpacking) * 1_000
    + recipe.requirements.length * 2
    + Number(kind === 'stonecutting') * 4
}

function normalizeRequiredCount(value: number): number {
  return Math.max(1, normalizeCount(value))
}

function normalizeCount(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
}

function hasKnownSource(target: CraftingTargetView): boolean {
  return Boolean(target.obtainHint) || Boolean(target.sources?.length)
}

function containsCycle(node: CraftingPlanNode): boolean {
  return node.state === 'cycle'
    || Boolean(node.station && containsCycle(node.station))
    || node.requirements.some(requirement => containsCycle(requirement.node))
}

function forkBuildContext(context: BuildContext): BuildContext {
  return {
    ...context,
    inventory: new Map(context.inventory),
    plannedStations: new Set(context.plannedStations)
  }
}

function commitBuildContext(
  target: BuildContext,
  source: BuildContext
): void {
  target.inventory = source.inventory
  target.plannedStations = source.plannedStations
}
