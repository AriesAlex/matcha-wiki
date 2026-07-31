<template>
  <CraftingNodeFrame
    :accessible-name="accessibleName"
    :title="plainTitle"
    :selected="selected"
    :inactive="inactive"
    :root="root"
    @open-details="emit('open-details')"
  >
    <span class="content" :class="displayKind">
      <span class="heading">
        <PhHammer :size="22" weight="bold" aria-hidden="true" />
        <span>
          <strong>{{ plainTitle }}</strong>
          <small v-if="node.detail">{{ node.detail }}</small>
        </span>
      </span>

      <CraftingRecipeGrid :recipe="node.recipe" />
      <small v-if="layoutHint" class="layout-hint">{{ layoutHint }}</small>
    </span>
  </CraftingNodeFrame>
</template>

<script setup lang="ts">
import { PhHammer } from '@phosphor-icons/vue'
import CraftingNodeFrame from './CraftingNodeFrame.vue'
import CraftingRecipeGrid from './CraftingRecipeGrid.vue'
import type { CraftingGraphRecipeNode } from '../../../types/craftingGraph'

const props = withDefaults(defineProps<{
  node: CraftingGraphRecipeNode
  selected?: boolean
  inactive?: boolean
  root?: boolean
}>(), {
  selected: false,
  inactive: false,
  root: false
})

const emit = defineEmits<{
  'open-details': []
}>()

const plainTitle = computed(() => stripMinecraftFormatting(props.node.title))
const displayKind = computed(() => craftingRecipeDisplayKind(props.node.recipe))
const layoutHint = computed(() => {
  const kind = recipeKind(props.node.recipe.type)
  if (kind === 'crafting_shapeless') return 'Порядок не важен'
  return displayKind.value === 'smithing'
    ? 'Шаблон · Основа · Добавка'
    : ''
})
const accessibleName = computed(() => [
  `Изготовление: ${plainTitle.value}`,
  props.node.detail.replace(/[.!?]+$/, ''),
  layoutHint.value,
  craftingRecipeLayoutLabel(props.node.recipe)
].filter(Boolean).join('. '))
</script>

<style scoped lang="scss">
.content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px;

  .heading {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    align-items: start;
    gap: 8px;

    > svg {
      margin-top: 1px;
      color: var(--muted);
    }

    > span {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    strong,
    small {
      display: -webkit-box;
      overflow: hidden;
      overflow-wrap: anywhere;
      white-space: normal;
      -webkit-box-orient: vertical;
    }

    strong {
      font-size: 14px;
      line-height: 1.2;
      -webkit-line-clamp: 2;
    }

    small {
      color: var(--muted);
      font-size: 10px;
      line-height: 1.3;
      -webkit-line-clamp: 4;
    }
  }

  &.grid :deep(.recipe-slots) {
    margin-top: auto;
  }

  &.smithing,
  &.single {
    justify-content: space-between;
  }

  .layout-hint {
    min-height: 14px;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.3;
    text-align: center;
  }
}
</style>
