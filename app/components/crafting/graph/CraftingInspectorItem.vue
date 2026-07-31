<template>
  <div class="item-pane">
    <dl>
      <div>
        <dt>Нужно</dt>
        <dd>{{ node.demand.required }}</dd>
      </div>
      <div v-if="node.demand.owned">
        <dt>Отмечено</dt>
        <dd>{{ node.demand.owned }}</dd>
      </div>
      <div v-if="complete">
        <dt>Статус</dt>
        <dd class="ready">Готово</dd>
      </div>
    </dl>

    <div
      v-if="node.planNode.recipeOptions.length"
      class="method"
    >
      <p>Как получить</p>
      <div
        class="switch"
        role="group"
        :aria-label="`Способ получения: ${plainTitle}`"
      >
        <button
          type="button"
          :aria-pressed="effectiveMode === 'craft'"
          @click="emit('select-mode', {
            targetKey: node.target.key,
            mode: 'craft'
          })"
        >
          Сделать
        </button>
        <button
          type="button"
          :aria-pressed="effectiveMode === 'obtain'"
          @click="emit('select-mode', {
            targetKey: node.target.key,
            mode: 'obtain'
          })"
        >
          Найти
        </button>
      </div>

      <CraftingRecipeSelect
        v-if="node.planNode.recipeOptions.length > 1 && effectiveMode === 'craft'"
        :recipes="node.planNode.recipeOptions"
        :selected-id="effectiveRecipeId"
        @select="emit('select-recipe', {
          targetKey: node.target.key,
          recipeId: $event
        })"
      />
    </div>

    <p v-if="node.target.vanillaName" class="vanilla">
      В обычном Minecraft: {{ node.target.vanillaName }}
    </p>
  </div>
</template>

<script setup lang="ts">
import CraftingRecipeSelect from './CraftingRecipeSelect.vue'
import type { CraftingMode } from '../../../types/crafting'
import type { CraftingGraphItemNode } from '../../../types/craftingGraph'

interface ModeSelection {
  targetKey: string
  mode: CraftingMode
}

interface RecipeSelection {
  targetKey: string
  recipeId: string
}

const props = withDefaults(defineProps<{
  node: CraftingGraphItemNode
  complete?: boolean
}>(), {
  complete: false
})

const emit = defineEmits<{
  'select-mode': [payload: ModeSelection]
  'select-recipe': [payload: RecipeSelection]
}>()

const plainTitle = computed(() => stripMinecraftFormatting(props.node.title))
const effectiveMode = computed<CraftingMode>(() => (
  props.node.planNode.state === 'obtain' ? 'obtain' : 'craft'
))
const effectiveRecipeId = computed(() => (
  props.node.planNode.recipe?.id
  || props.node.planNode.recipeOptions[0]?.id
  || ''
))
</script>

<style scoped lang="scss">
.item-pane {
  dl {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    margin: 18px 0 0;

    div {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    dt {
      color: var(--muted);
      font-size: 11px;
    }

    dd {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;

      &.ready {
        color: var(--accent);
      }
    }
  }

  .method {
    margin-top: 22px;

    > p {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 800;
    }

    .switch {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 2px;
      background: var(--surface-deep);

      button {
        min-height: 40px;
        padding: 7px 10px;
        color: var(--muted);
        background: transparent;
        border: 0;
        font-size: 12px;

        &[aria-pressed='true'] {
          color: var(--ink);
          background: var(--surface);
        }
      }
    }
  }

  .vanilla {
    margin: 18px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
}
</style>
