<template>
  <section class="crafting-path">
    <header>
      <div>
        <p class="eyebrow">Путь изготовления</p>
        <h2>С чего начать</h2>
        <p>
          Отмечайте то, что уже лежит в инвентаре. Ветка пересчитается и
          оставит только недостающие шаги.
        </p>
      </div>
      <button
        v-if="hasProgress"
        type="button"
        @click="progress.reset"
      >
        <PhArrowCounterClockwise :size="17" aria-hidden="true" />
        Сбросить отметки
      </button>
    </header>

    <div
      class="path"
      aria-live="polite"
      aria-atomic="false"
    >
      <CraftingPathNode :node="plan" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { PhArrowCounterClockwise } from '@phosphor-icons/vue'
import craftingPlannerSource from '../../generated/crafting-planner.json'
import CraftingPathNode from './crafting/CraftingPathNode.vue'
import type { CraftingPlannerSupplement } from '../types/crafting'
import type { ItemView } from '../types/wiki'

const props = defineProps<{
  item: ItemView
}>()

const catalog = useWikiCatalog()
const craftingPlanner = craftingPlannerSource as CraftingPlannerSupplement
const index = createCraftingIndex(catalog, craftingPlanner)
const progress = provideCraftingProgress()
const target = computed(() => targetForItem(props.item))
const plan = computed(() => buildCraftingPlan(
  index,
  target.value,
  1,
  {
    modeByTarget: progress.state.value.modeByTarget,
    recipeByTarget: progress.state.value.recipeByTarget,
    optionByRequirement: progress.state.value.optionByRequirement
  },
  progress.state.value.ownedByTarget
))
const hasProgress = computed(() => (
  Object.keys(progress.state.value.ownedByTarget).length > 0
  || Object.keys(progress.state.value.modeByTarget).length > 0
  || Object.keys(progress.state.value.recipeByTarget).length > 0
  || Object.keys(progress.state.value.optionByRequirement).length > 0
))
</script>

<style scoped lang="scss">
.crafting-path {
  max-width: 960px;
  margin-top: 64px;

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
      min-height: 42px;
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

  .path {
    padding: 4px 20px 4px 24px;
    background:
      linear-gradient(
        110deg,
        color-mix(in srgb, var(--surface-quiet) 72%, transparent),
        transparent 70%
      );
    border-top: 1px solid var(--edge);
    border-bottom: 1px solid var(--edge);
  }
}

@media (max-width: 620px) {
  .crafting-path {
    > header {
      align-items: flex-start;
      flex-direction: column;
    }

    .path {
      padding-inline: 10px;
    }
  }
}
</style>
