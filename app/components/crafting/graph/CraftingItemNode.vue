<template>
  <CraftingNodeFrame
    :accessible-name="accessibleName"
    :title="plainTitle"
    :selected="selected"
    :complete="complete"
    :inactive="inactive"
    :root="root"
    toggleable
    @open-details="emit('open-details')"
    @toggle="emit('toggle')"
  >
    <span class="content">
      <span class="icon" aria-hidden="true">
        <img
          v-if="iconUrl"
          :src="iconUrl"
          alt=""
          width="52"
          height="52"
          draggable="false"
        >
        <span v-else>?</span>
        <b v-if="!root">
          {{ node.demand.required }}
        </b>
      </span>

      <span class="copy">
        <strong><MinecraftText :text="node.title" /></strong>
        <small :class="{ ready: complete }">
          {{ complete ? 'Готово' : node.detail }}
        </small>
      </span>
    </span>
  </CraftingNodeFrame>
</template>

<script setup lang="ts">
import CraftingNodeFrame from './CraftingNodeFrame.vue'
import type { CraftingGraphItemNode } from '../../../types/craftingGraph'

const props = withDefaults(defineProps<{
  node: CraftingGraphItemNode
  selected?: boolean
  complete?: boolean
  inactive?: boolean
  root?: boolean
}>(), {
  selected: false,
  complete: false,
  inactive: false,
  root: false
})

const emit = defineEmits<{
  'open-details': []
  toggle: []
}>()

const plainTitle = computed(() => stripMinecraftFormatting(props.node.title))
const iconUrl = computed(() => (
  props.node.target.icon ? useAssetPath(props.node.target.icon) : ''
))
const accessibleName = computed(() => {
  const state = props.root
    ? (props.complete ? 'Готово' : props.node.detail)
    : (props.complete
        ? `Готово: ${props.node.demand.required}`
        : `Нужно: ${props.node.demand.required}`)

  return [
    plainTitle.value,
    state,
    props.root || props.complete ? '' : props.node.detail
  ].filter(Boolean).join('. ')
})
</script>

<style scoped lang="scss">
.content {
  height: 100%;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px 58px 12px 12px;

  .icon {
    position: relative;
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--accent) 8%, transparent);

    img {
      width: 52px;
      height: 52px;
      object-fit: contain;
      image-rendering: pixelated;
      user-select: none;
    }

    > span {
      color: var(--muted);
      font-size: 22px;
      font-weight: 800;
    }

    b {
      position: absolute;
      right: -4px;
      bottom: -4px;
      min-width: 22px;
      padding: 2px 4px;
      color: var(--surface);
      background: var(--ink);
      font-size: 11px;
      line-height: 1.45;
      text-align: center;
    }
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;

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
      line-height: 1.3;
      -webkit-line-clamp: 4;

      &.ready {
        color: var(--accent);
        font-weight: 750;
      }
    }
  }
}
</style>
