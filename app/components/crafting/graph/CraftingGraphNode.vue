<template>
  <article
    class="node"
    :class="[
      graphNode.kind,
      graphNode.status,
      {
        complete,
        selected,
        root: node.depth === 0
      }
    ]"
    :data-node-id="node.instanceId"
    @pointerenter="showAtPointer"
    @pointermove="moveAtPointer"
    @pointerleave="hidePointerTooltip"
    @focusin="showAtFocus"
    @focusout="hideFocusTooltip"
  >
    <button
      type="button"
      :aria-label="accessibleName"
      :aria-pressed="graphNode.kind === 'item' ? complete : selected"
      @click="activate"
    >
      <span
        v-if="graphNode.kind === 'item'"
        class="icon"
        aria-hidden="true"
      >
        <img
          v-if="iconUrl"
          :src="iconUrl"
          alt=""
          width="40"
          height="40"
          draggable="false"
        >
        <span v-else>?</span>
        <b v-if="graphNode.demand.required > 1">
          {{ graphNode.demand.required }}
        </b>
      </span>
      <span
        v-else
        class="kind-icon"
        aria-hidden="true"
      >
        <component
          :is="kindIcon"
          :size="20"
          weight="bold"
        />
      </span>

      <span class="copy">
        <strong><MinecraftText :text="displayTitle" /></strong>
        <small>{{ visibleDetail }}</small>
      </span>

      <span
        v-if="graphNode.kind === 'item'"
        class="check"
        aria-hidden="true"
      >
        <PhCheckCircle
          v-if="complete"
          :size="23"
          weight="fill"
        />
        <PhCircle
          v-else
          :size="23"
        />
      </span>
    </button>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowsSplit,
  PhCheckCircle,
  PhCircle,
  PhHammer,
  PhMapPin,
  PhQuestion,
  PhWarning,
  PhWrench
} from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type {
  CraftingGraphMethodNode,
  CraftingGraphNodeView
} from '../../../types/craftingGraph'

interface TooltipAnchor {
  x: number
  y: number
}

const props = withDefaults(defineProps<{
  node: CraftingGraphNodeView
  complete?: boolean
  selected?: boolean
}>(), {
  complete: false,
  selected: false
})

const emit = defineEmits<{
  select: [instanceId: string]
  'toggle-subtree': [instanceId: string]
  'tooltip-open': [node: CraftingGraphNodeView, anchor: TooltipAnchor]
  'tooltip-move': [anchor: TooltipAnchor]
  'tooltip-close': []
}>()

const graphNode = computed(() => props.node.node)
const iconUrl = computed(() => (
  graphNode.value.kind === 'item' && graphNode.value.target.icon
    ? useAssetPath(graphNode.value.target.icon)
    : ''
))
const stateLabel = computed(() => {
  if (props.complete) return 'Готово'
  return {
    owned: 'Готово',
    craft: 'Нужно изготовить',
    obtain: 'Нужно получить',
    cycle: 'Путь зациклен',
    unknown: 'Путь неизвестен'
  }[graphNode.value.status]
})
const displayTitle = computed(() => (
  graphNode.value.kind === 'method'
  && graphNode.value.methodKind === 'obtain'
    ? 'Получить в мире'
    : graphNode.value.title
))
const visibleDetail = computed(() => (
  graphNode.value.kind === 'item'
    ? stateLabel.value
    : graphNode.value.detail
))
const kindIcon = computed<Component>(() => {
  const current = graphNode.value
  if (current.kind === 'item') return PhCircle
  if (current.kind === 'context') {
    if (current.contextKind === 'choice') return PhArrowsSplit
    return current.contextKind === 'source' ? PhMapPin : PhWrench
  }

  return {
    recipe: PhHammer,
    obtain: PhMapPin,
    unknown: PhQuestion,
    cycle: PhWarning
  }[(current as CraftingGraphMethodNode).methodKind]
})
const accessibleName = computed(() => {
  const parts = [stripMinecraftFormatting(displayTitle.value)]
  if (graphNode.value.kind === 'item') {
    parts.push(
      `нужно ${graphNode.value.demand.required}`,
      stateLabel.value
    )
  } else {
    parts.push(graphNode.value.detail)
  }
  return parts.join(', ')
})
const focusWithin = ref(false)

function activate(): void {
  if (graphNode.value.kind === 'item') {
    emit('toggle-subtree', props.node.instanceId)
    return
  }
  emit('select', props.node.instanceId)
}

function showAtPointer(event: PointerEvent): void {
  if (event.pointerType === 'touch') return
  emit('tooltip-open', props.node, pointerAnchor(event))
}

function moveAtPointer(event: PointerEvent): void {
  if (event.pointerType === 'touch') return
  emit('tooltip-move', pointerAnchor(event))
}

function hidePointerTooltip(event: PointerEvent): void {
  if (event.pointerType !== 'touch' && !focusWithin.value) {
    emit('tooltip-close')
  }
}

function showAtFocus(event: FocusEvent): void {
  focusWithin.value = true
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  emit('tooltip-open', props.node, {
    x: bounds.right,
    y: bounds.top + bounds.height / 2
  })
}

function hideFocusTooltip(event: FocusEvent): void {
  const nextTarget = event.relatedTarget
  if (
    nextTarget instanceof Node
    && (event.currentTarget as HTMLElement).contains(nextTarget)
  ) return

  focusWithin.value = false
  emit('tooltip-close')
}

function pointerAnchor(event: PointerEvent): TooltipAnchor {
  return {
    x: event.clientX,
    y: event.clientY
  }
}
</script>

<style scoped lang="scss">
.node {
  color: var(--ink);

  button {
    width: 100%;
    height: 100%;
    min-width: 0;
    display: grid;
    align-items: center;
    color: inherit;
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    border: 1px solid var(--edge);
    box-shadow: 0 7px 18px var(--shadow);
    text-align: left;

    &:hover {
      background: color-mix(in srgb, var(--surface-quiet) 76%, var(--surface));
    }
  }

  &.selected button {
    border-color: var(--accent);
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--accent) 36%, transparent),
      0 8px 20px var(--shadow);
  }

  &.root button {
    border-width: 2px;
  }

  &.item {
    width: 172px;
    height: 76px;

    button {
      grid-template-columns: 46px minmax(0, 1fr) 24px;
      gap: 7px;
      padding: 8px;
    }
  }

  &.method {
    width: 148px;
    height: 50px;
  }

  &.context {
    width: 132px;
    height: 46px;
  }

  &.method,
  &.context {
    button {
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 6px;
      padding: 6px 8px;
      box-shadow: none;
    }

    .copy {
      strong {
        font-size: 11px;
      }

      small {
        font-size: 9px;
      }
    }
  }

  &.complete {
    .check {
      color: var(--accent);
    }

    button {
      background: color-mix(in srgb, var(--accent) 9%, var(--surface));
    }
  }

  &.cycle,
  &.unknown {
    button {
      border-color: color-mix(in srgb, #c67b70 58%, var(--edge));
    }
  }

  .icon {
    position: relative;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--accent) 8%, transparent);

    img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      image-rendering: pixelated;
      user-select: none;
    }

    > span {
      color: var(--muted);
      font-size: 18px;
      font-weight: 800;
    }

    b {
      position: absolute;
      right: -3px;
      bottom: -3px;
      min-width: 19px;
      padding: 1px 3px;
      color: var(--surface);
      background: var(--ink);
      font-size: 10px;
      line-height: 1.5;
      text-align: center;
    }
  }

  .kind-icon {
    display: grid;
    place-items: center;
    color: var(--muted);
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      font-size: 12px;
      line-height: 1.25;
    }

    small {
      color: var(--muted);
      font-size: 10px;
      line-height: 1.25;
    }
  }

  .check {
    display: grid;
    place-items: center;
    color: var(--muted);
  }
}
</style>
