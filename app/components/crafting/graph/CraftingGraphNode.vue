<template>
  <div
    class="node-shell"
    :data-node-id="node.instanceId"
    @pointerdown.capture="markPointerFocus"
    @pointerenter="showAtPointer"
    @pointermove="moveAtPointer"
    @pointerleave="hidePointerTooltip"
    @focusin="showAtFocus"
    @focusout="hideFocusTooltip"
  >
    <CraftingItemNode
      v-if="graphNode.kind === 'item'"
      :node="graphNode"
      :selected="selected"
      :complete="complete"
      :inactive="inactive"
      :root="node.depth === 0"
      @open-details="emit('open-details', node.instanceId)"
      @toggle="emit('toggle-item', node.instanceId)"
    />

    <CraftingRecipeNode
      v-else-if="graphNode.kind === 'recipe'"
      :node="graphNode"
      :selected="selected"
      :inactive="inactive"
      :root="node.depth === 0"
      @open-details="emit('open-details', node.instanceId)"
    />

    <CraftingSourceNode
      v-else-if="graphNode.kind === 'source'"
      :node="graphNode"
      :selected="selected"
      :inactive="inactive"
      :root="node.depth === 0"
      @open-details="emit('open-details', node.instanceId)"
    />

    <CraftingAlternativesNode
      v-else
      :node="graphNode"
      :selected="selected"
      :inactive="inactive"
      :root="node.depth === 0"
      @open-details="emit('open-details', node.instanceId)"
      @select-option="selectOption"
    />
  </div>
</template>

<script setup lang="ts">
import CraftingAlternativesNode from './CraftingAlternativesNode.vue'
import CraftingItemNode from './CraftingItemNode.vue'
import CraftingRecipeNode from './CraftingRecipeNode.vue'
import CraftingSourceNode from './CraftingSourceNode.vue'
import type { CraftingGraphNodeView } from '../../../types/craftingGraph'

interface TooltipAnchor {
  x: number
  y: number
}

const props = withDefaults(defineProps<{
  node: CraftingGraphNodeView
  complete?: boolean
  selected?: boolean
  inactive?: boolean
}>(), {
  complete: false,
  selected: false,
  inactive: false
})

const emit = defineEmits<{
  'open-details': [instanceId: string]
  'toggle-item': [instanceId: string]
  'select-option': [requirementId: string, targetKey: string]
  'focus-node': [instanceId: string]
  highlight: [instanceId: string]
  'tooltip-open': [node: CraftingGraphNodeView, anchor: TooltipAnchor]
  'tooltip-move': [anchor: TooltipAnchor]
  'tooltip-close': []
}>()

const graphNode = computed(() => props.node.node)
const focusWithin = ref(false)
const pointerFocus = ref(false)

function markPointerFocus(): void {
  pointerFocus.value = true
  queueMicrotask(() => pointerFocus.value = false)
}

function showAtPointer(event: PointerEvent): void {
  if (event.pointerType === 'touch') return
  emit('highlight', props.node.instanceId)
  emit('tooltip-open', props.node, pointerAnchor(event))
}

function moveAtPointer(event: PointerEvent): void {
  if (event.pointerType === 'touch') return
  emit('tooltip-move', pointerAnchor(event))
}

function hidePointerTooltip(event: PointerEvent): void {
  if (event.pointerType !== 'touch' && !focusWithin.value) {
    emit('highlight', '')
    emit('tooltip-close')
  }
}

async function showAtFocus(event: FocusEvent): Promise<void> {
  focusWithin.value = true
  const target = event.target
  const shell = event.currentTarget as HTMLElement
  if (
    !pointerFocus.value
    && target instanceof HTMLElement
    && target.matches(':focus-visible')
  ) {
    emit('focus-node', props.node.instanceId)
    await nextTick()
    if (!focusWithin.value || !shell.contains(document.activeElement)) return
  }
  emit('highlight', props.node.instanceId)
  const bounds = shell.getBoundingClientRect()
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
  emit('highlight', '')
  emit('tooltip-close')
}

function selectOption(requirementId: string, targetKey: string): void {
  emit('select-option', requirementId, targetKey)
}

function pointerAnchor(event: PointerEvent): TooltipAnchor {
  return {
    x: event.clientX,
    y: event.clientY
  }
}
</script>

<style scoped lang="scss">
.node-shell {
  color: var(--ink);
}
</style>
