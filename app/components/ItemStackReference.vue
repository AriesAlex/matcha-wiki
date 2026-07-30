<template>
  <ItemReference
    class="stack-reference"
    :item="resolvedItem"
    :ingredient="ingredient"
    :stack="stack"
  >
    <ItemSlotSurface
      :icon-url="iconUrl"
      :display-name="displayName"
      :fallback-mark="fallbackMark"
      :count="displayCount"
    />
    <span class="copy">
      <strong><MinecraftText :text="displayName" /></strong>
      <small v-if="secondary">{{ secondary }}</small>
      <small v-else-if="displayCount > 1">Нужно: {{ displayCount }}</small>
    </span>
  </ItemReference>
</template>

<script setup lang="ts">
import type {
  IngredientView,
  ItemView,
  StackView
} from '../types/wiki'

const props = withDefaults(defineProps<{
  item?: ItemView
  ingredient?: IngredientView
  stack?: StackView
  count?: number
  label?: string
  icon?: string
  secondary?: string
}>(), {
  item: undefined,
  ingredient: undefined,
  stack: undefined,
  count: undefined,
  label: '',
  icon: '',
  secondary: ''
})

const catalog = useWikiCatalog()
const resolvedItem = computed(() => (
  props.item
  ?? (props.stack ? resolveStackItem(catalog.items, props.stack) : undefined)
  ?? (props.ingredient ? resolveIngredientItem(catalog.items, props.ingredient) : undefined)
))
const displayName = computed(() => (
  props.label
  || resolvedItem.value?.title
  || props.stack?.name
  || props.ingredient?.label
  || 'Неизвестный предмет'
))
const displayCount = computed(() => props.count ?? props.stack?.count ?? 1)
const iconUrl = computed(() => {
  const path = props.icon
    || resolvedItem.value?.icon
    || props.stack?.icon
    || props.ingredient?.icons[0]
  return path ? useAssetPath(path) : ''
})
const fallbackMark = computed(() => props.ingredient?.tag ? '#' : '?')
</script>

<style scoped lang="scss">
.stack-reference {
  min-width: 0;
  display: inline-grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  strong {
    overflow-wrap: anywhere;
    line-height: 1.25;
  }

  small {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.35;
  }

  &:is(a):hover strong,
  &:is(a):focus-visible strong {
    color: var(--accent);
  }
}
</style>
