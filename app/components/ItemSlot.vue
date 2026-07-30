<template>
  <ItemReference
    v-if="!isEmpty"
    class="slot-target"
    :item="resolvedItem"
    :ingredient="ingredient"
    :stack="stack"
    :aria-label="displayName"
  >
    <ItemSlotSurface
      :icon-url="iconUrl"
      :display-name="displayName"
      :fallback-mark="fallbackMark"
      :count="stack?.count"
      :large="large"
    />
  </ItemReference>
  <ItemSlotSurface
    v-else
    :large="large"
    empty
  />
</template>

<script setup lang="ts">
import ItemReference from './ItemReference.vue'
import ItemSlotSurface from './ItemSlotSurface.vue'
import type { IngredientView, StackView } from '../types/wiki'

const props = withDefaults(
  defineProps<{
    ingredient?: IngredientView
    stack?: StackView
    empty?: boolean
    large?: boolean
  }>(),
  {
    ingredient: undefined,
    stack: undefined,
    empty: false,
    large: false
  }
)

const catalog = useWikiCatalog()
const isEmpty = computed(() => props.empty || (!props.stack && !props.ingredient))
const resolvedItem = computed(() => {
  if (props.stack) return resolveStackItem(catalog.items, props.stack)
  if (props.ingredient) return resolveIngredientItem(catalog.items, props.ingredient)
  return undefined
})
const iconUrl = computed(() => {
  const icon = props.stack?.icon ?? props.ingredient?.icons[0]
  return icon ? useAssetPath(icon) : ''
})
const displayName = computed(() => {
  if (isEmpty.value) return 'Пустой слот'
  if (resolvedItem.value) return stripMinecraftFormatting(resolvedItem.value.title)
  if (props.stack) return stripMinecraftFormatting(props.stack.name) || 'Неизвестный предмет'
  if (props.ingredient?.label) return stripMinecraftFormatting(props.ingredient.label)
  if (props.ingredient?.tag) return `Тег: ${props.ingredient.tag}`
  return 'Неизвестный предмет'
})
const fallbackMark = computed(() => props.ingredient?.tag ? '#' : '?')
</script>

<style scoped lang="scss">
.slot-target {
  display: inline-flex;
}
</style>
