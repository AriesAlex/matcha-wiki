<template>
  <span
    class="slot"
    :class="{ large, empty: isEmpty }"
  >
    <ItemReference
      v-if="!isEmpty"
      class="slot-target"
      :item="resolvedItem"
      :ingredient="ingredient"
      :stack="stack"
      :aria-label="displayName"
    >
      <img
        v-if="iconUrl"
        class="icon"
        :src="iconUrl"
        :alt="displayName"
        width="32"
        height="32"
        draggable="false"
      >
      <span
        v-else
        class="fallback"
        aria-hidden="true"
      >{{ fallbackMark }}</span>
    </ItemReference>
    <b
      v-if="showCount"
      class="count"
      aria-hidden="true"
    >{{ stack?.count }}</b>
  </span>
</template>

<script setup lang="ts">
import ItemReference from './ItemReference.vue'
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
const showCount = computed(() => Boolean(props.stack && props.stack.count > 1))
</script>

<style scoped lang="scss">
.slot {
  position: relative;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  background: var(--slot-surface);
  box-shadow:
    inset 2px 2px 0 var(--slot-shadow),
    inset -2px -2px 0 var(--slot-highlight);

  &.large {
    width: 64px;
    height: 64px;

    .icon {
      width: 48px;
      height: 48px;
    }
  }

  &.empty {
    background: var(--slot-empty);
  }

  .icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
    user-select: none;
  }

  > :deep(.slot-target) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fallback {
    color: #f4f4f4;
    font-size: 18px;
    font-weight: 800;
    line-height: 1;
    text-shadow: 2px 2px 0 #343434;
    user-select: none;
  }

  .count {
    position: absolute;
    right: 3px;
    bottom: 1px;
    color: #fff;
    font-size: 14px;
    line-height: 1;
    text-shadow: 2px 2px 0 #343434;
    pointer-events: none;
    user-select: none;
  }
}
</style>
