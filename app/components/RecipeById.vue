<template>
  <div class="embedded-recipe">
    <RecipeViewer
      v-if="recipe"
      :recipe="recipe"
    />
    <p v-else>
      Рецепт <code>{{ id }}</code> не найден в текущей версии пака.
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: string
}>()

const catalog = useWikiCatalog()
const recipe = computed(() => catalog.recipes.find(entry => entry.id === props.id))
</script>

<style scoped lang="scss">
.embedded-recipe {
  margin: 26px 0;
}
</style>
