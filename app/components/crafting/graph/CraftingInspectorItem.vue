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

    <div v-if="node.planNode.recipeOptions.length > 1" class="recipe-choice">
      <CraftingRecipeSelect
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
import type { CraftingGraphItemNode } from '../../../types/craftingGraph'

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
  'select-recipe': [payload: RecipeSelection]
}>()

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

  .recipe-choice {
    margin-top: 22px;
  }

  .vanilla {
    margin: 18px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
}
</style>
