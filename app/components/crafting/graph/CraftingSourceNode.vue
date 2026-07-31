<template>
  <CraftingNodeFrame
    :accessible-name="accessibleName"
    :title="plainTitle"
    :selected="selected"
    :inactive="inactive"
    :root="root"
    @open-details="emit('open-details')"
  >
    <span class="content">
      <CraftingSourceIcon :kind="node.source.kind" :size="27" />
      <span class="copy">
        <strong>{{ plainTitle }}</strong>
        <small>{{ node.detail }}</small>
      </span>
    </span>
  </CraftingNodeFrame>
</template>

<script setup lang="ts">
import CraftingNodeFrame from './CraftingNodeFrame.vue'
import CraftingSourceIcon from './CraftingSourceIcon.vue'
import type { CraftingGraphSourceNode } from '../../../types/craftingGraph'

const props = withDefaults(defineProps<{
  node: CraftingGraphSourceNode
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
const accessibleName = computed(() => `${plainTitle.value}. ${props.node.detail}`)
</script>

<style scoped lang="scss">
.content {
  height: 100%;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 16px;

  > svg {
    margin-top: 2px;
    color: var(--muted);
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;

    strong,
    small {
      display: -webkit-box;
      overflow: hidden;
      overflow-wrap: anywhere;
      white-space: normal;
      -webkit-box-orient: vertical;
    }

    strong {
      font-size: 15px;
      line-height: 1.2;
      -webkit-line-clamp: 3;
    }

    small {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
      -webkit-line-clamp: 4;
    }
  }
}
</style>
