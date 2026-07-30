<template>
  <div class="method-pane">
    <dl v-if="node.methodKind === 'recipe'">
      <div>
        <dt>Подходов</dt>
        <dd>{{ node.batches }}</dd>
      </div>
      <div>
        <dt>За подход</dt>
        <dd>{{ node.resultCount }}</dd>
      </div>
      <div>
        <dt>Получится</dt>
        <dd>{{ node.producedCount }}</dd>
      </div>
    </dl>

    <CraftingRecipeSelect
      v-if="node.planNode.recipeOptions.length > 1"
      label="Другой рецепт"
      :recipes="node.planNode.recipeOptions"
      :selected-id="effectiveRecipeId"
      @select="emit('select-recipe', {
        targetKey: node.targetKey,
        recipeId: $event
      })"
    />
  </div>
</template>

<script setup lang="ts">
import CraftingRecipeSelect from './CraftingRecipeSelect.vue'
import type { CraftingGraphMethodNode } from '../../../types/craftingGraph'

interface RecipeSelection {
  targetKey: string
  recipeId: string
}

const props = withDefaults(defineProps<{
  node: CraftingGraphMethodNode
  selectedRecipeId?: string
}>(), {
  selectedRecipeId: ''
})

const emit = defineEmits<{
  'select-recipe': [payload: RecipeSelection]
}>()

const effectiveRecipeId = computed(() => (
  props.selectedRecipeId
  || props.node.planNode.recipe?.id
  || props.node.planNode.recipeOptions[0]?.id
  || ''
))
</script>

<style scoped lang="scss">
.method-pane {
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
    }
  }
}
</style>
