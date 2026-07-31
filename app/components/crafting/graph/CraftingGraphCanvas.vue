<template>
  <div
    ref="explorerRef"
    class="explorer"
    :class="{ fullscreen, active: gesturesActive }"
    :role="fullscreen ? 'dialog' : undefined"
    :aria-modal="fullscreen ? 'true' : undefined"
    :aria-label="fullscreen ? 'Полноэкранная карта изготовления' : undefined"
    :tabindex="fullscreen ? -1 : undefined"
  >
    <div class="bar">
      <div>
        <strong>Карта пути</strong>
        <span>
          {{ isMobile
            ? 'Щипок — масштаб · тяните карту, чтобы двигать'
            : 'Колесо — масштаб · тяните фон, чтобы двигать карту' }}
        </span>
      </div>

      <button
        class="gesture-toggle"
        type="button"
        :aria-pressed="gesturesActive"
        @click="gesturesActive = !gesturesActive"
      >
        <PhHandGrabbing :size="18" aria-hidden="true" />
        {{ gesturesActive ? 'Вернуться к странице' : 'Двигать схему' }}
      </button>

      <CraftingGraphControls
        :scale="viewport.transform.value.scale"
        :fullscreen="fullscreen"
        :can-zoom-in="viewport.transform.value.scale < scaleRange.maxScale"
        :can-zoom-out="viewport.transform.value.scale > scaleRange.minScale"
        @zoom-in="viewport.zoomIn()"
        @zoom-out="viewport.zoomOut()"
        @fit="viewport.fit()"
        @focus-root="focusRoot"
        @toggle-fullscreen="toggleFullscreen"
      />
    </div>

    <div
      ref="rootRef"
      class="viewport"
      role="region"
      aria-label="Интерактивная карта изготовления"
      tabindex="0"
      :style="viewport.rootStyle.value"
      data-crafting-viewport-background
    >
      <div
        ref="contentRef"
        class="scene"
        :style="[
          sceneSize,
          viewport.transformStyle.value
        ]"
        data-crafting-viewport-background
      >
        <CraftingGraphEdges
          :edges="graph.edges"
          :highlighted-node-id="highlightedNodeId"
          :inactive-edge-ids="activity.inactiveEdgeIds"
        />

        <CraftingGraphNode
          v-for="node in graph.nodes"
          :key="node.instanceId"
          :node="node"
          :selected="selectedId === node.instanceId"
          :complete="completedNodeIds.includes(node.instanceId)"
          :inactive="inactiveNodeIds.has(node.instanceId)"
          :style="nodeStyle(node)"
          @open-details="toggleDetails"
          @toggle-item="toggleItem"
          @select-option="selectOption"
          @focus-node="focusNode"
          @highlight="highlightedNodeId = $event"
          @tooltip-open="openTooltip"
          @tooltip-move="moveTooltip"
          @tooltip-close="closeTooltip"
        />
      </div>

      <CraftingNodeInspector
        :node="selectedNode"
        :open="Boolean(selectedNode)"
        :complete="selectedId ? completedNodeIds.includes(selectedId) : false"
        @close="closeDetails"
        @select-recipe="emit('select-recipe', $event.targetKey, $event.recipeId)"
        @select-option="emit('select-option', $event.requirementKey, $event.targetKey)"
      />

      <button
        v-if="gesturesActive && !fullscreen"
        class="release-gestures"
        type="button"
        @click="gesturesActive = false"
      >
        <PhArrowBendDownLeft :size="18" aria-hidden="true" />
        Прокручивать страницу
      </button>
    </div>

    <CraftingGraphTooltip
      :node="tooltip.node"
      :visible="tooltip.visible && !fullscreenInspector"
      :complete="tooltip.node ? completedNodeIds.includes(tooltip.node.instanceId) : false"
      :x="tooltip.x"
      :y="tooltip.y"
    />

    <p class="visually-hidden" aria-live="polite">
      {{ announcement }}
    </p>

    <CraftingGraphTextPlan :graph="graph" />
  </div>
</template>

<script setup lang="ts">
import {
  useEventListener,
  useMediaQuery,
  useScrollLock
} from '@vueuse/core'
import {
  PhArrowBendDownLeft,
  PhHandGrabbing
} from '@phosphor-icons/vue'
import type { CSSProperties } from 'vue'
import CraftingNodeInspector from './CraftingNodeInspector.vue'
import type {
  CraftingGraphModel,
  CraftingGraphNodeView,
  CraftingGraphView
} from '../../../types/craftingGraph'
import { craftingGraphActivity } from '../../../utils/craftingGraphProgress'
import { DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE } from '../../../utils/craftingViewport'

interface TooltipState {
  visible: boolean
  node?: CraftingGraphNodeView
  x: number
  y: number
}

interface TooltipAnchor {
  x: number
  y: number
}

const props = defineProps<{
  graph: CraftingGraphView
  completedNodeIds: readonly string[]
}>()

const emit = defineEmits<{
  'toggle-item': [instanceId: string]
  'select-recipe': [targetKey: string, recipeId: string]
  'select-option': [requirementKey: string, targetKey: string]
}>()

const rootRef = useTemplateRef<HTMLElement>('rootRef')
const contentRef = useTemplateRef<HTMLElement>('contentRef')
const explorerRef = useTemplateRef<HTMLElement>('explorerRef')
const scaleRange = DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE
const gesturesActive = ref(false)
const fullscreen = ref(false)
const selectedId = ref('')
const highlightedNodeId = ref('')
const announcement = ref('')
const tooltip = reactive<TooltipState>({
  visible: false,
  x: 0,
  y: 0
})
let selectionTrigger: HTMLElement | null = null
const body = computed(() => import.meta.client ? document.body : null)
const bodyScrollLocked = useScrollLock(body)
const isMobile = useMediaQuery('(max-width: 720px)')
const viewport = useCraftingViewport({
  bounds: () => props.graph.bounds,
  activated: gesturesActive,
  fullscreen,
  autoFit: false,
  fitPadding: 34
})

watch(rootRef, element => viewport.rootRef.value = element, { immediate: true })
watch(contentRef, element => viewport.contentRef.value = element, { immediate: true })
watch(
  [rootRef, contentRef, () => props.graph.rootId],
  async ([root, content]) => {
    if (!root || !content) return
    await nextTick()
    focusRootAtScale(false, false)
  },
  { immediate: true, flush: 'post' }
)
watch(
  () => props.graph.nodes,
  (nodes, previousNodes) => {
    if (!selectedId.value || nodes.some(node => node.instanceId === selectedId.value)) {
      return
    }

    const previous = previousNodes?.find(node => (
      node.instanceId === selectedId.value
    ))
    selectedId.value = previous
      ? nodes.find(node => sameGraphSubject(node, previous))?.instanceId ?? ''
      : ''
  },
  { flush: 'sync' }
)
watch(fullscreen, (value) => {
  if (value) gesturesActive.value = true
})
watch(
  [fullscreen, isMobile, selectedId],
  ([isFullscreen, mobile, selection]) => {
    bodyScrollLocked.value = isFullscreen || (mobile && Boolean(selection))
  },
  { immediate: true }
)

useEventListener(
  () => import.meta.client ? window : null,
  'keydown',
  (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeOverlay()
  }
)

onBeforeUnmount(() => {
  bodyScrollLocked.value = false
})

const selectedNode = computed(() => (
  props.graph.nodes.find(node => node.instanceId === selectedId.value)
))
const graphModel = computed<CraftingGraphModel>(() => ({
  rootId: props.graph.rootId,
  nodes: props.graph.nodes.map(node => node.node),
  edges: props.graph.edges
}))
const activity = computed(() => craftingGraphActivity(
  graphModel.value,
  new Set(props.completedNodeIds)
))
const inactiveNodeIds = computed(() => new Set(activity.value.inactiveNodeIds))
const fullscreenInspector = computed(() => (
  fullscreen.value && Boolean(selectedNode.value)
))

useModalFocusTrap(explorerRef, fullscreen, rootRef, {
  inertOutside: true
})
const sceneSize = computed<CSSProperties>(() => ({
  width: `${props.graph.bounds.width}px`,
  height: `${props.graph.bounds.height}px`
}))

function nodeStyle(node: CraftingGraphNodeView): CSSProperties {
  return {
    position: 'absolute',
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`
  }
}

async function toggleDetails(instanceId: string): Promise<void> {
  if (selectedId.value === instanceId) {
    await closeDetails()
    return
  }

  selectionTrigger = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
  selectedId.value = instanceId
  closeTooltip()
}

async function closeDetails(): Promise<void> {
  selectedId.value = ''
  closeTooltip()
  await nextTick()
  if (selectionTrigger?.isConnected) selectionTrigger.focus()
  selectionTrigger = null
}

function toggleItem(instanceId: string): void {
  closeTooltip()
  emit('toggle-item', instanceId)
  const node = props.graph.nodes.find(entry => entry.instanceId === instanceId)
  announcement.value = node
    ? `Обновлена ветка «${stripMinecraftFormatting(node.node.title)}».`
    : 'Ветка обновлена.'
}

function selectOption(requirementKey: string, targetKey: string): void {
  closeTooltip()
  emit('select-option', requirementKey, targetKey)
}

function focusNode(instanceId: string): void {
  const node = props.graph.nodes.find(entry => entry.instanceId === instanceId)
  if (!node) return
  viewport.focusBounds(node, {
    scale: viewport.transform.value.scale,
    verticalAnchor: 0.46,
    animate: false,
    markInteracted: true
  })
}

function openTooltip(
  node: CraftingGraphNodeView,
  anchor: TooltipAnchor
): void {
  tooltip.node = node
  tooltip.visible = true
  moveTooltip(anchor)
}

function moveTooltip(anchor: TooltipAnchor): void {
  tooltip.x = anchor.x
  tooltip.y = anchor.y
}

function closeTooltip(): void {
  tooltip.visible = false
}

function focusRoot(): void {
  focusRootAtScale(true, true)
}

function focusRootAtScale(animate: boolean, markInteracted: boolean): void {
  const root = props.graph.nodes.find(node => node.instanceId === props.graph.rootId)
  if (!root) return

  viewport.focusBounds(root, {
    scale: 1,
    verticalAnchor: 0.24,
    animate,
    markInteracted
  })
}

async function toggleFullscreen(): Promise<void> {
  fullscreen.value = !fullscreen.value
  await nextTick()
  focusRootAtScale(true, false)
}

async function closeOverlay(): Promise<void> {
  if (selectedId.value) {
    await closeDetails()
    return
  }
  if (fullscreen.value) {
    fullscreen.value = false
    return
  }
  gesturesActive.value = false
}

function sameGraphSubject(
  candidate: CraftingGraphNodeView,
  previous: CraftingGraphNodeView
): boolean {
  if (candidate.node.kind !== previous.node.kind) return false
  if (candidate.node.kind === 'item' && previous.node.kind === 'item') {
    return candidate.node.target.key === previous.node.target.key
  }
  if (candidate.node.kind === 'recipe' && previous.node.kind === 'recipe') {
    return candidate.node.targetKey === previous.node.targetKey
  }
  if (
    candidate.node.kind === 'alternatives'
    && previous.node.kind === 'alternatives'
  ) {
    return candidate.node.ownerTargetKey === previous.node.ownerTargetKey
      && candidate.node.requirementId === previous.node.requirementId
      && candidate.node.alternativeKind === previous.node.alternativeKind
  }
  return candidate.node.kind === 'source'
    && previous.node.kind === 'source'
    && candidate.node.targetKey === previous.node.targetKey
    && candidate.node.source.id === previous.node.source.id
}
</script>

<style scoped lang="scss">
.explorer {
  --graph-grid: color-mix(in srgb, var(--edge) 24%, transparent);
  position: relative;
  overflow: clip;
  background: var(--surface);
  border: 1px solid var(--edge);

  &.fullscreen {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    flex-direction: column;
    padding:
      env(safe-area-inset-top)
      env(safe-area-inset-right)
      env(safe-area-inset-bottom)
      env(safe-area-inset-left);

    .viewport {
      min-height: 0;
      flex: 1;
      border: 0;
    }
  }

  .bar {
    position: relative;
    z-index: 7;
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 9px 10px 9px 16px;
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    border-bottom: 1px solid var(--edge);

    > div:first-child {
      min-width: 0;
      display: flex;
      flex-direction: column;

      strong {
        font-family: 'Tiny5', monospace;
        font-size: 20px;
        letter-spacing: 0.03em;
      }

      span {
        color: var(--muted);
        font-size: 11px;
      }
    }

    > :last-child {
      margin-left: auto;
    }
  }

  .viewport {
    position: relative;
    height: clamp(480px, 68dvh, 720px);
    overflow: hidden;
    background:
      radial-gradient(
        circle at 50% 8%,
        color-mix(in srgb, var(--accent) 10%, transparent),
        transparent 38%
      ),
      linear-gradient(var(--graph-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--graph-grid) 1px, transparent 1px),
      var(--page);
    background-size: auto, 28px 28px, 28px 28px, auto;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .scene {
    position: absolute;
    inset: 0 auto auto 0;
  }

  .gesture-toggle,
  .release-gestures {
    min-height: 44px;
    align-items: center;
    gap: 7px;
    color: var(--ink);
    background: var(--surface-quiet);
    border: 1px solid var(--edge);
    font-size: 12px;
    font-weight: 750;
  }

  .gesture-toggle {
    display: none;
    padding: 7px 10px;
  }

  .release-gestures {
    position: absolute;
    right: 12px;
    bottom: 12px;
    z-index: 6;
    display: inline-flex;
    padding: 8px 12px;
    box-shadow: 0 8px 22px var(--shadow);
  }

}

@media (max-width: 720px) {
  .explorer {
    .bar {
      align-items: flex-start;
      flex-wrap: wrap;

      > div:first-child {
        flex: 1;
      }

      > :last-child {
        width: 100%;
        margin-left: 0;
      }
    }

    .gesture-toggle {
      display: inline-flex;
    }

    .viewport {
      height: min(68dvh, 560px);
      cursor: default;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .explorer * {
    animation: none;
  }
}
</style>
