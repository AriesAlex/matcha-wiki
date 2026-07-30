import { describe, expect, it } from 'vitest'
import type {
  CraftingPlanNode,
  CraftingPlanRequirement,
  CraftingRecipeView,
  CraftingTargetView
} from '../app/types/crafting'
import type {
  CraftingGraphChoiceNode,
  CraftingGraphItemNode,
  CraftingGraphMethodNode,
  CraftingGraphSourceNode,
  CraftingGraphStationNode
} from '../app/types/craftingGraph'
import { buildCraftingGraph } from '../app/utils/craftingGraphModel'

describe('crafting graph model', () => {
  it('deduplicates repeated items and recalculates their shared batch once', () => {
    const ore = target('minecraft:raw_copper', 'Необработанная медь')
    const ingot = target('minecraft:copper_ingot', 'Медный слиток')
    const machine = target('matcha:double_tool', 'Двойной инструмент')
    const firstIngot = craftNode(ingot, {
      recipeId: 'minecraft:copper_ingot',
      resultCount: 4,
      requirements: [{ child: obtainNode(ore), count: 1 }]
    })
    const secondIngot = craftNode(ingot, {
      recipeId: 'minecraft:copper_ingot',
      resultCount: 4,
      requirements: [{ child: obtainNode(ore), count: 1 }]
    })
    const root = craftNode(machine, {
      recipeId: 'matcha:double_tool',
      requirements: [
        { id: 'left', child: firstIngot, count: 1 },
        { id: 'right', child: secondIngot, count: 1 }
      ]
    })

    const graph = buildCraftingGraph(root)
    const ingotNode = itemNode(graph, ingot.key)
    const oreNode = itemNode(graph, ore.key)
    const ingotMethod = methodNode(graph, 'minecraft:copper_ingot')
    const ingotEdges = graph.edges.filter(edge => edge.to === ingotNode.instanceId)

    expect(ingotNode.occurrences).toBe(2)
    expect(ingotNode.demand).toEqual({
      required: 2,
      owned: 0,
      missing: 2,
      batches: 1,
      produced: 4,
      surplus: 2
    })
    expect(ingotMethod.batches).toBe(1)
    expect(oreNode.demand.required).toBe(1)
    expect(ingotEdges).toHaveLength(1)
    expect(ingotEdges[0]?.count).toBe(2)
  })

  it('keeps twenty same-title music discs as explicit OR options', () => {
    const discIds = Array.from(
      { length: 20 },
      (_, index) => `minecraft:music_disc_${index + 1}`
    )
    const groupedDisc: CraftingTargetView = {
      key: `resource:alternatives:${discIds.slice().sort().join('|')}`,
      kind: 'resource',
      resourceId: discIds.join('|'),
      title: 'Пластинка'
    }
    const output = target('minecraft:disc_fragment_5', 'Фрагмент пластинки')
    const root = craftNode(output, {
      recipeId: 'matcha:disc_fragment_from_disc',
      requirements: [{
        child: obtainNode(groupedDisc),
        count: 1,
        options: [groupedDisc],
        selectedOptionKey: groupedDisc.key
      }]
    })

    const graph = buildCraftingGraph(root)
    const choice = graph.nodes.find(
      (node): node is CraftingGraphChoiceNode => (
        node.kind === 'context' && node.contextKind === 'choice'
      )
    )

    expect(choice).toBeDefined()
    expect(choice?.options).toHaveLength(20)
    expect(new Set(choice?.options.map(option => option.key)).size).toBe(20)
    expect(choice?.options.every(option => option.selected)).toBe(true)
    expect(choice?.detail).toBe('Подойдёт любой из 20 вариантов')
    expect(graph.edges.some(edge => (
      edge.from === choice?.instanceId
      && edge.kind === 'selected-option'
    ))).toBe(true)
  })

  it('shares one station context and one reusable station item', () => {
    const craftingTable = target('minecraft:crafting_table', 'Верстак')
    const partA = target('matcha:part_a', 'Деталь А')
    const partB = target('matcha:part_b', 'Деталь Б')
    const output = target('matcha:assembly', 'Сборка')
    const stationPlan = ownedNode(craftingTable)
    const firstPart = craftNode(partA, {
      recipeId: 'matcha:part_a',
      station: 'Верстак',
      stationResourceId: 'minecraft:crafting_table',
      stationNode: stationPlan
    })
    const secondPart = craftNode(partB, {
      recipeId: 'matcha:part_b',
      station: 'Верстак',
      stationResourceId: 'minecraft:crafting_table'
    })
    const root = craftNode(output, {
      recipeId: 'matcha:assembly',
      requirements: [
        { child: firstPart, count: 1 },
        { child: secondPart, count: 1 }
      ]
    })

    const graph = buildCraftingGraph(root)
    const stations = graph.nodes.filter(
      (node): node is CraftingGraphStationNode => (
        node.kind === 'context' && node.contextKind === 'station'
      )
    )
    const tableItems = graph.nodes.filter(node => (
      node.kind === 'item' && node.target.key === craftingTable.key
    ))
    const stationEdges = graph.edges.filter(edge => edge.kind === 'station')

    expect(stations).toHaveLength(1)
    expect(tableItems).toHaveLength(1)
    expect(stations[0]?.itemNodeId).toBe(tableItems[0]?.instanceId)
    expect(stationEdges).toHaveLength(2)
    expect(tableItems[0]?.demand.required).toBe(1)
  })

  it('guards a selected cycle without duplicating the root demand', () => {
    const targetA = target('matcha:a', 'Предмет А')
    const targetB = target('matcha:b', 'Предмет Б')
    const cycleBack = {
      ...obtainNode(targetA),
      state: 'cycle' as const
    }
    const nodeB = craftNode(targetB, {
      recipeId: 'matcha:b',
      requirements: [{ child: cycleBack, count: 1 }]
    })
    const root = craftNode(targetA, {
      recipeId: 'matcha:a',
      requirements: [{ child: nodeB, count: 1 }]
    })

    const first = buildCraftingGraph(root)
    const second = buildCraftingGraph(root)
    const rootItem = itemNode(first, targetA.key)
    const cyclicEdges = first.edges.filter(edge => edge.cyclic)

    expect(first.nodes).toHaveLength(4)
    expect(rootItem.demand.required).toBe(1)
    expect(rootItem.status).toBe('cycle')
    expect(cyclicEdges).toHaveLength(1)
    expect(cyclicEdges[0]).toMatchObject({
      to: rootItem.instanceId,
      kind: 'requirement'
    })
    expect(first.nodes.map(node => [node.instanceId, node.path]))
      .toEqual(second.nodes.map(node => [node.instanceId, node.path]))
  })

  it('calculates batches, produced amount, surplus and downstream demand', () => {
    const ingredient = target('minecraft:iron_ingot', 'Железный слиток')
    const output = target('matcha:plates', 'Пластины')
    const root = craftNode(output, {
      requiredCount: 5,
      recipeId: 'matcha:plates',
      resultCount: 2,
      requirements: [{ child: obtainNode(ingredient), count: 3 }]
    })

    const graph = buildCraftingGraph(root)
    const rootItem = itemNode(graph, output.key)
    const rootMethod = methodNode(graph, 'matcha:plates')
    const ingredientItem = itemNode(graph, ingredient.key)

    expect(rootItem.demand).toEqual({
      required: 5,
      owned: 0,
      missing: 5,
      batches: 3,
      produced: 6,
      surplus: 1
    })
    expect(rootMethod).toMatchObject({
      batches: 3,
      resultCount: 2,
      producedCount: 6
    })
    expect(ingredientItem.demand.required).toBe(9)
    expect(rootItem.planNode.requiredCount).toBe(5)
    expect(rootItem.planNode.batches).toBe(3)
  })

  it('keeps concrete acquisition alternatives as linked source nodes', () => {
    const opal: CraftingTargetView = {
      ...target('minecraft:opal', 'Опал'),
      sources: [
        {
          id: 'elder-guardian-opal',
          kind: 'mob',
          title: 'Древний страж',
          detail: 'Победите древнего стража.',
          path: '/mobs/elder-guardian'
        },
        {
          id: 'ancient-city-opal',
          kind: 'location',
          title: 'Древний город',
          detail: 'Ищите в сундуках древнего города.',
          path: '/locations/ancient-city'
        }
      ]
    }

    const graph = buildCraftingGraph(obtainNode(opal))
    const sources = graph.nodes.filter(
      (node): node is CraftingGraphSourceNode => (
        node.kind === 'context' && node.contextKind === 'source'
      )
    )
    const sourceEdges = graph.edges.filter(edge => (
      sources.some(source => source.instanceId === edge.to)
    ))

    expect(sources.map(source => source.source.path).sort()).toEqual([
      '/locations/ancient-city',
      '/mobs/elder-guardian',
    ])
    expect(sourceEdges).toHaveLength(2)
    expect(sourceEdges.every(edge => edge.kind === 'context')).toBe(true)
  })
})

interface CraftNodeOptions {
  recipeId: string
  requiredCount?: number
  resultCount?: number
  station?: string
  stationResourceId?: string
  stationNode?: CraftingPlanNode
  requirements?: Array<{
    id?: string
    child: CraftingPlanNode
    count: number
    options?: CraftingTargetView[]
    selectedOptionKey?: string
  }>
}

function craftNode(
  currentTarget: CraftingTargetView,
  options: CraftNodeOptions
): CraftingPlanNode {
  const requiredCount = options.requiredCount ?? 1
  const resultCount = options.resultCount ?? 1
  const batches = Math.ceil(requiredCount / resultCount)
  const requirementInputs = options.requirements ?? []
  const recipeRequirements = requirementInputs.map((requirement, index) => ({
    id: requirement.id ?? `ingredient-${index}`,
    role: 'ingredient' as const,
    count: requirement.count,
    ingredient: {
      ids: [requirement.child.target.resourceId],
      label: requirement.child.target.title,
      icons: requirement.child.target.icon
        ? [requirement.child.target.icon]
        : []
    }
  }))
  const recipe: CraftingRecipeView = {
    id: options.recipeId,
    origin: 'pack',
    type: 'minecraft:crafting_shaped',
    station: options.station ?? 'Инвентарь',
    targetKey: currentTarget.key,
    resultCount,
    requirements: recipeRequirements,
    stationResourceId: options.stationResourceId
  }
  const requirements: CraftingPlanRequirement[] = requirementInputs
    .map((requirement, index) => {
      const id = requirement.id ?? `ingredient-${index}`
      return {
        id: `${currentTarget.key}|${recipe.id}|${id}`,
        role: 'ingredient',
        count: requirement.count * batches,
        label: requirement.child.target.title,
        options: requirement.options ?? [requirement.child.target],
        selectedOptionKey: requirement.selectedOptionKey
          ?? requirement.child.target.key,
        node: {
          ...requirement.child,
          requiredCount: requirement.count * batches,
          missingCount: Math.max(
            0,
            requirement.count * batches - requirement.child.ownedCount
          )
        }
      }
    })

  return {
    id: `plan|${currentTarget.key}`,
    target: currentTarget,
    requiredCount,
    ownedCount: 0,
    missingCount: requiredCount,
    state: 'craft',
    recipeOptions: [recipe],
    recipe,
    batches,
    resultCount,
    station: options.stationNode,
    requirements
  }
}

function obtainNode(
  currentTarget: CraftingTargetView,
  requiredCount = 1
): CraftingPlanNode {
  return {
    id: `plan|${currentTarget.key}`,
    target: currentTarget,
    requiredCount,
    ownedCount: 0,
    missingCount: requiredCount,
    state: 'obtain',
    recipeOptions: [],
    batches: 0,
    resultCount: 1,
    requirements: []
  }
}

function ownedNode(currentTarget: CraftingTargetView): CraftingPlanNode {
  return {
    ...obtainNode(currentTarget),
    ownedCount: 1,
    missingCount: 0,
    state: 'owned'
  }
}

function target(resourceId: string, title: string): CraftingTargetView {
  return {
    key: `resource:${resourceId}`,
    kind: 'resource',
    resourceId,
    title
  }
}

function itemNode(
  graph: ReturnType<typeof buildCraftingGraph>,
  targetKey: string
): CraftingGraphItemNode {
  const node = graph.nodes.find(
    (candidate): candidate is CraftingGraphItemNode => (
      candidate.kind === 'item' && candidate.target.key === targetKey
    )
  )
  if (!node) throw new Error(`Missing graph item ${targetKey}`)
  return node
}

function methodNode(
  graph: ReturnType<typeof buildCraftingGraph>,
  recipeId: string
): CraftingGraphMethodNode {
  const node = graph.nodes.find(
    (candidate): candidate is CraftingGraphMethodNode => (
      candidate.kind === 'method'
      && candidate.recipe?.id === recipeId
    )
  )
  if (!node) throw new Error(`Missing graph method ${recipeId}`)
  return node
}
