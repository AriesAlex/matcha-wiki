<template>
  <article
    class="path-node"
    :class="node.state"
    :aria-label="plainTitle"
  >
    <header>
      <ItemStackReference
        :item="node.target.item"
        :ingredient="targetIngredient"
        :count="node.requiredCount"
        :label="node.target.title"
        :icon="node.target.icon"
        :secondary="amountLabel"
      />

      <div class="progress">
        <span>{{ stateLabel }}</span>
        <button
          v-if="node.state !== 'owned'"
          type="button"
          :aria-pressed="false"
          @click="progress.addOwned(node.target.key, node.missingCount)"
        >
          <PhCheck
            :size="16"
            weight="bold"
            aria-hidden="true"
          />
          Уже есть
        </button>
        <button
          v-else
          class="undo"
          type="button"
          :aria-pressed="true"
          @click="progress.clearOwned(node.target.key)"
        >
          <PhArrowCounterClockwise
            :size="16"
            aria-hidden="true"
          />
          Вернуть в план
        </button>
      </div>
    </header>

    <p
      v-if="node.target.vanillaName"
      class="identity"
    >
      В обычном Minecraft это {{ node.target.vanillaName }}.
    </p>

    <CraftingPathMethodPicker
      v-if="node.recipeOptions.length"
      :node="node"
      :selected-mode="selectedMode"
      @select-mode="progress.setMode(node.target.key, $event)"
      @select-recipe="progress.selectRecipe(node.target.key, $event)"
    />

    <p
      v-if="node.state === 'obtain'"
      class="hint"
    >
      <PhMapPin
        :size="18"
        aria-hidden="true"
      />
      {{ node.target.obtainHint ?? 'Этот ресурс нужно найти в мире, добыть или получить у персонажа.' }}
    </p>
    <p
      v-else-if="node.state === 'cycle'"
      class="warning"
    >
      <PhWarning
        :size="18"
        aria-hidden="true"
      />
      Этот вариант ведёт по кругу. Выберите другой рецепт или добудьте ресурс в мире.
    </p>
    <p
      v-else-if="node.state === 'unknown'"
      class="warning"
    >
      <PhQuestion
        :size="18"
        aria-hidden="true"
      />
      Для этого ресурса пока не найден надёжный путь. Проверьте его подсказку или другой вариант ингредиента.
    </p>

    <CraftingPathBranches
      v-if="node.state === 'craft' && node.recipe"
      :node="node"
      @select-option="progress.selectOption"
    >
      <template #station>
        <CraftingPathNode
          v-if="node.station"
          :node="node.station"
        />
      </template>
      <template #requirement="{ requirement }">
        <CraftingPathNode :node="requirement.node" />
      </template>
    </CraftingPathBranches>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowCounterClockwise,
  PhCheck,
  PhMapPin,
  PhQuestion,
  PhWarning
} from '@phosphor-icons/vue'
import type { CraftingPlanNode } from '../../types/crafting'
import type { IngredientView } from '../../types/wiki'

const props = defineProps<{
  node: CraftingPlanNode
}>()

const progress = useCraftingProgress()
const plainTitle = computed(() => stripMinecraftFormatting(props.node.target.title))
const targetIngredient = computed<IngredientView | undefined>(() => (
  props.node.target.kind === 'resource'
    ? {
        ids: props.node.target.resourceId.startsWith('#')
          ? []
          : [props.node.target.resourceId],
        tag: props.node.target.resourceId.startsWith('#')
          ? props.node.target.resourceId.slice(1)
          : undefined,
        label: plainTitle.value,
        icons: props.node.target.icon ? [props.node.target.icon] : []
      }
    : undefined
))
const selectedMode = computed(() => (
  progress.state.value.modeByTarget[props.node.target.key]
))
const amountLabel = computed(() => {
  if (!props.node.ownedCount) return `Нужно: ${props.node.requiredCount}`
  return `Есть ${props.node.ownedCount} из ${props.node.requiredCount}`
})
const stateLabel = computed(() => ({
  owned: 'Готово',
  craft: 'Нужно изготовить',
  obtain: 'Нужно добыть',
  cycle: 'Путь зациклен',
  unknown: 'Нужна разведка'
})[props.node.state])
</script>

<style scoped lang="scss">
.path-node {
  min-width: 0;
  padding: 14px 0;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .progress {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;

    > span {
      color: var(--muted);
      font-size: 12px;
    }

    button {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      color: var(--surface);
      background: var(--accent);
      border: 0;
      font-size: 12px;
      font-weight: 750;

      &:hover,
      &:focus-visible {
        background: var(--accent-ink);
      }

      &.undo {
        color: var(--muted);
        background: transparent;
      }
    }
  }

  .identity,
  .hint,
  .warning {
    max-width: 680px;
    margin: 9px 0 0 54px;
    color: var(--muted);
    font-size: 13px;
  }

  .hint,
  .warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;

    svg {
      flex: none;
      margin-top: 1px;
      color: var(--accent);
    }
  }

  .warning svg {
    color: #d7a63b;
  }

  &.owned {
    opacity: 0.62;

    > header {
      text-decoration-color: var(--accent);
    }
  }

  &.cycle,
  &.unknown {
    .item-stack-reference {
      opacity: 0.78;
    }
  }
}

@media (max-width: 620px) {
  .path-node {
    > header {
      align-items: flex-start;
      flex-direction: column;
    }

    .progress {
      width: 100%;
      justify-content: space-between;
      padding-left: 54px;
    }

    .identity,
    .hint,
    .warning {
      margin-left: 0;
    }
  }
}
</style>
