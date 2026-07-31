import { describe, expect, it } from 'vitest'
import type {
  CraftingPlanNode,
  CraftingPlanRequirement,
  CraftingRecipeView,
  CraftingTargetView
} from '../app/types/crafting'
import type {
  CraftingGraphAlternativesNode,
  CraftingGraphItemNode,
  CraftingGraphRecipeNode,
  CraftingGraphSourceNode
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
    const ingotRecipe = recipeNode(graph, 'minecraft:copper_ingot')
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
    expect(ingotRecipe.batches).toBe(1)
    expect(oreNode.demand.required).toBe(1)
    expect(ingotEdges).toHaveLength(1)
    expect(ingotEdges[0]?.count).toBe(2)
  })

  it('keeps a music-disc set in one OR group without duplicating item nodes', () => {
    const discIds = Array.from(
      { length: 20 },
      (_, index) => `minecraft:music_disc_${index + 1}`
    )
    const discTargets = discIds.map((resourceId, index): CraftingTargetView => ({
      ...target(resourceId, `Пластинка «${index + 1}»`),
      icon: `/textures/music_disc_${index + 1}.png`,
      detailsPath: `/recipes/crafting/music_disc_${index + 1}`,
      obtainHint: index === 0 ? 'Найдите в сокровищнице.' : undefined,
      sources: index === 0
        ? [{
            id: 'vault-disc-1',
            kind: 'location',
            title: 'Сокровищница',
            detail: 'Найдите в сокровищнице.',
            path: '/locations/vault'
          }]
        : []
    }))
    const groupedDisc: CraftingTargetView = {
      key: `resource:alternatives:${discIds.slice().sort().join('|')}`,
      kind: 'resource',
      resourceId: discIds.join('|'),
      title: 'Пластинка — любой вариант',
      alternativeTargets: discTargets
    }
    const output = target('minecraft:disc_fragment_5', 'Осколок пластинки')
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
    const alternatives = graph.nodes.find(
      (node): node is CraftingGraphAlternativesNode => (
        node.kind === 'alternatives'
        && node.alternativeKind === 'ingredient'
      )
    )
    const discItems = graph.nodes.filter(node => (
      node.kind === 'item'
      && node.target.resourceId.includes('minecraft:music_disc_')
    ))

    expect(alternatives).toBeDefined()
    expect(alternatives?.options).toHaveLength(20)
    expect(new Set(alternatives?.options.map(option => option.key)).size).toBe(20)
    expect(alternatives?.options.every(option => option.selected)).toBe(true)
    expect(alternatives?.options[0]).toMatchObject({
      title: 'Пластинка «1»',
      detail: 'Найдите в сокровищнице.',
      icon: '/textures/music_disc_1.png',
      path: '/recipes/crafting/music_disc_1',
      targetKey: 'resource:minecraft:music_disc_1'
    })
    expect(discItems).toHaveLength(0)
    expect(graph.edges.filter(edge => edge.to === alternatives?.instanceId))
      .toEqual([expect.objectContaining({ kind: 'alternative' })])
    expect(graph.edges.filter(edge => edge.from === alternatives?.instanceId))
      .toHaveLength(0)
  })

  it('does not materialize station or obtain proxy nodes', () => {
    const craftingTable = target('minecraft:crafting_table', 'Верстак')
    const material = target('minecraft:iron_ingot', 'Железный слиток')
    const output = target('matcha:assembly', 'Сборка')
    const root = craftNode(output, {
      recipeId: 'matcha:assembly',
      station: 'Верстак',
      stationResourceId: 'minecraft:crafting_table',
      requirements: [{ child: obtainNode(material), count: 1 }]
    })

    const graph = buildCraftingGraph(root)
    const terminalGraph = buildCraftingGraph(obtainNode(material))

    expect(graph.nodes.map(node => node.kind).sort()).toEqual([
      'item',
      'item',
      'recipe'
    ])
    expect(graph.nodes.some(node => (
      node.kind === 'item' && node.target.key === craftingTable.key
    ))).toBe(false)
    expect(graph.edges.map(edge => edge.kind).sort()).toEqual([
      'recipe',
      'requirement'
    ])
    expect(terminalGraph.nodes.map(node => node.kind)).toEqual(['item'])
    expect(terminalGraph.edges).toHaveLength(0)
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
    const outputRecipe = recipeNode(graph, 'matcha:plates')
    const ingredientItem = itemNode(graph, ingredient.key)

    expect(rootItem.demand).toEqual({
      required: 5,
      owned: 0,
      missing: 5,
      batches: 3,
      produced: 6,
      surplus: 1
    })
    expect(outputRecipe).toMatchObject({
      batches: 3,
      resultCount: 2,
      producedCount: 6,
      surplus: 1
    })
    expect(ingredientItem.demand.required).toBe(9)
    expect(rootItem.planNode.requiredCount).toBe(5)
    expect(rootItem.planNode.batches).toBe(3)
  })

  it('groups multiple acquisition sources behind one incoming edge', () => {
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
    const alternatives = graph.nodes.find(
      (node): node is CraftingGraphAlternativesNode => (
        node.kind === 'alternatives'
        && node.alternativeKind === 'source'
      )
    )
    const sourceNodes = graph.nodes.filter(node => node.kind === 'source')
    const incoming = graph.edges.filter(edge => edge.to === alternatives?.instanceId)

    expect(alternatives?.options.map(option => option.path).sort()).toEqual([
      '/locations/ancient-city',
      '/mobs/elder-guardian'
    ])
    expect(sourceNodes).toHaveLength(0)
    expect(incoming).toEqual([expect.objectContaining({
      from: graph.rootId,
      kind: 'source'
    })])
  })

  it('links a single acquisition source directly without a generic method', () => {
    const avesta: CraftingTargetView = {
      ...target('minecraft:avesta', 'Авеста'),
      sources: [{
        id: 'desert-well-avesta',
        kind: 'location',
        title: 'Пустынный колодец',
        detail: 'Исследуйте подозрительный песок.',
        path: '/locations/desert-well'
      }]
    }

    const graph = buildCraftingGraph(obtainNode(avesta))
    const source = graph.nodes.find(
      (node): node is CraftingGraphSourceNode => node.kind === 'source'
    )

    expect(graph.nodes.map(node => node.kind)).toEqual(['item', 'source'])
    expect(source?.source.path).toBe('/locations/desert-well')
    expect(graph.edges).toEqual([expect.objectContaining({
      from: graph.rootId,
      to: source?.instanceId,
      kind: 'source'
    })])
  })
})

interface CraftNodeOptions {
  recipeId: string
  requiredCount?: number
  resultCount?: number
  station?: string
  stationResourceId?: string
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
      ids: (requirement.options ?? [requirement.child.target])
        .map(option => option.resourceId),
      label: requirement.child.target.title,
      icons: (requirement.options ?? [requirement.child.target])
        .flatMap(option => option.icon ? [option.icon] : [])
    }
  }))
  const recipe: CraftingRecipeView = {
    id: options.recipeId,
    origin: 'pack',
    type: 'minecraft:crafting_shaped',
    station: options.station ?? 'Инвентарь',
    targetKey: currentTarget.key,
    resultCount,
    ingredients: recipeRequirements.map(requirement => requirement.ingredient),
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

function recipeNode(
  graph: ReturnType<typeof buildCraftingGraph>,
  recipeId: string
): CraftingGraphRecipeNode {
  const node = graph.nodes.find(
    (candidate): candidate is CraftingGraphRecipeNode => (
      candidate.kind === 'recipe' && candidate.recipe.id === recipeId
    )
  )
  if (!node) throw new Error(`Missing graph recipe ${recipeId}`)
  return node
}
