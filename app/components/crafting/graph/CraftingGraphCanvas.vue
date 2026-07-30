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
        <span>Нажмите предмет, чтобы отметить его ветку</span>
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
      @keydown.esc="closeOverlay"
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
        <CraftingGraphEdges :edges="graph.edges" />

        <CraftingGraphNode
          v-for="node in graph.nodes"
          :key="node.instanceId"
          :node="node"
          :selected="selectedId === node.instanceId"
          :complete="completedNodeIds.includes(node.instanceId)"
          :style="nodeStyle(node)"
          @select="selectNode"
          @toggle-subtree="toggleSubtree"
          @tooltip-open="openTooltip"
          @tooltip-move="moveTooltip"
          @tooltip-close="closeTooltip"
        />
      </div>

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
      :x="tooltip.x"
      :y="tooltip.y"
    />

    <CraftingNodeInspector
      :node="selectedNode"
      :open="Boolean(selectedNode)"
      :complete="selectedNodeComplete"
      @close="selectedId = ''"
      @toggle-subtree="toggleSubtree"
      @select-mode="emit('select-mode', $event.targetKey, $event.mode)"
      @select-recipe="emit('select-recipe', $event.targetKey, $event.recipeId)"
      @select-option="emit('select-option', $event.requirementKey, $event.targetKey)"
    />

    <p class="visually-hidden" aria-live="polite">
      {{ announcement }}
    </p>

    <CraftingGraphTextPlan :nodes="graph.nodes" />
  </div>
</template>

<script setup lang="ts">
import {
  useEventListener,
  useScrollLock
} from '@vueuse/core'
import {
  PhArrowBendDownLeft,
  PhHandGrabbing
} from '@phosphor-icons/vue'
import type { CSSProperties } from 'vue'
import CraftingNodeInspector from './CraftingNodeInspector.vue'
import type {
  CraftingGraphNodeView,
  CraftingGraphView
} from '../../../types/craftingGraph'
import type { CraftingMode } from '../../../types/crafting'
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
  select: [instanceId: string]
  'toggle-subtree': [instanceId: string]
  'select-mode': [targetKey: string, mode: CraftingMode]
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
const announcement = ref('')
const tooltip = reactive<TooltipState>({
  visible: false,
  x: 0,
  y: 0
})
const body = computed(() => import.meta.client ? document.body : null)
const bodyScrollLocked = useScrollLock(body)
const viewport = useCraftingViewport({
  bounds: () => props.graph.bounds,
  activated: gesturesActive,
  fullscreen,
  autoFit: true,
  fitPadding: 34
})

watch(rootRef, element => viewport.rootRef.value = element, { immediate: true })
watch(contentRef, element => viewport.contentRef.value = element, { immediate: true })
watch(fullscreen, (value) => {
  bodyScrollLocked.value = value
  if (value) gesturesActive.value = true
})

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
const selectedNodeComplete = computed(() => (
  selectedNode.value
    ? props.completedNodeIds.includes(selectedNode.value.instanceId)
    : false
))
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

function selectNode(instanceId: string): void {
  selectedId.value = instanceId
  closeTooltip()
  emit('select', instanceId)
}

function toggleSubtree(instanceId: string): void {
  selectedId.value = instanceId
  closeTooltip()
  emit('toggle-subtree', instanceId)
  const node = props.graph.nodes.find(entry => entry.instanceId === instanceId)
  announcement.value = node
    ? `Обновлена ветка «${stripMinecraftFormatting(node.node.title)}».`
    : 'Ветка обновлена.'
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
  const root = props.graph.nodes.find(node => node.instanceId === props.graph.rootId)
  if (!root) return

  const scale = viewport.transform.value.scale
  viewport.setTransform({
    scale,
    x: viewport.viewportSize.value.width / 2
      - (root.x + root.width / 2) * scale,
    y: Math.max(30, viewport.viewportSize.value.height * 0.16)
      - root.y * scale
  }, { animate: true })
}

function toggleFullscreen(): void {
  fullscreen.value = !fullscreen.value
  nextTick(() => viewport.fit())
}

function closeOverlay(): void {
  if (selectedId.value) {
    selectedId.value = ''
    return
  }
  if (fullscreen.value) {
    fullscreen.value = false
    return
  }
  gesturesActive.value = false
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
