<template>
  <section
    v-if="canBuildPath"
    class="crafting-path"
    aria-labelledby="crafting-path-heading"
  >
    <header>
      <div>
        <p class="eyebrow">Путь изготовления</p>
        <h2 id="crafting-path-heading">С чего начать</h2>
        <p>
          Откройте карточку, чтобы узнать подробности. Галочка справа отмечает
          предмет готовым и приглушает уже ненужную часть пути.
        </p>
      </div>

      <button
        v-if="hasRouteProgress"
        type="button"
        @click="clearRouteProgress"
      >
        <PhArrowCounterClockwise :size="17" aria-hidden="true" />
        Сбросить готовое
      </button>
    </header>

    <CraftingGraphCanvas
      :graph="graphView"
      :completed-node-ids="completedNodeIds"
      @toggle-item="toggleItem"
      @select-mode="progress.setMode"
      @select-recipe="progress.selectRecipe"
      @select-option="progress.selectOption"
    />
  </section>
</template>

<script setup lang="ts">
import { PhArrowCounterClockwise } from '@phosphor-icons/vue'
import craftingPlannerSource from '../../generated/crafting-planner.json'
import type {
  CraftingPlannerSupplement,
  CraftingTargetView
} from '../types/crafting'

const props = defineProps<{
  target: CraftingTargetView
}>()

const catalog = useWikiCatalog()
const craftingPlanner = craftingPlannerSource as CraftingPlannerSupplement
const index = createCraftingIndex(catalog, craftingPlanner)
const progress = useCraftingProgress()
const canBuildPath = computed(() => (
  index.recipesByTarget.has(props.target.key)
  || Boolean(props.target.sources?.length)
))
const structuralPlan = computed(() => buildCraftingPlan(
  index,
  props.target,
  1,
  {
    modeByTarget: progress.state.value.modeByTarget,
    recipeByTarget: progress.state.value.recipeByTarget,
    optionByRequirement: progress.state.value.optionByRequirement
  },
  {}
))
const graphModel = computed(() => buildCraftingGraph(structuralPlan.value))
const graphView = computed(() => layoutCraftingGraph(graphModel.value))
const routeTargetKeys = computed(() => [...new Set(
  graphModel.value.nodes.flatMap(node => (
    node.kind === 'item' ? [node.target.key] : []
  ))
)])
const hasRouteProgress = computed(() => routeTargetKeys.value.some(
  targetKey => (progress.state.value.ownedByTarget[targetKey] ?? 0) > 0
))
const completedNodeIds = computed(() => graphModel.value.nodes.flatMap((node) => {
  if (node.kind !== 'item') return []
  return (progress.state.value.ownedByTarget[node.target.key] ?? 0)
    >= node.demand.required
    ? [node.instanceId]
    : []
}))
const completedNodeIdSet = computed(() => new Set(completedNodeIds.value))

function toggleItem(instanceId: string): void {
  const item = craftingItemProgress(graphModel.value, instanceId)
  if (!item) return

  if (completedNodeIdSet.value.has(instanceId)) {
    progress.clearOwnedBatch([item.targetKey])
  } else {
    progress.setOwnedBatch({ [item.targetKey]: item.required })
  }
}

function clearRouteProgress(): void {
  progress.clearOwnedBatch(routeTargetKeys.value)
}
</script>

<style scoped lang="scss">
.crafting-path {
  max-width: 1040px;
  margin-top: 72px;

  > header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 20px;

    p:last-child {
      max-width: 680px;
      margin: 12px 0 0;
      color: var(--muted);
    }

    > button {
      min-height: 44px;
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 12px;
      color: var(--muted);
      background: transparent;
      border: 1px solid var(--edge);
      font-size: 13px;

      &:hover,
      &:focus-visible {
        color: var(--ink);
        border-color: var(--accent);
      }
    }
  }
}

@media (max-width: 720px) {
  .crafting-path {
    margin-top: 56px;

    > header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
}
</style>
