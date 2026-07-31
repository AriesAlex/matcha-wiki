<template>
  <div class="recipe-pane">
    <CraftingRecipeSelect
      v-if="node.planNode.recipeOptions.length > 1"
      label="Другой способ"
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
import type { CraftingGraphRecipeNode } from '../../../types/craftingGraph'

interface RecipeSelection {
  targetKey: string
  recipeId: string
}

const props = defineProps<{
  node: CraftingGraphRecipeNode
}>()

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
.recipe-pane:empty {
  display: none;
}
</style>
