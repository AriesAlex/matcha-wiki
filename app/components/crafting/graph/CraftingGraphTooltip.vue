<template>
  <Teleport to="body">
    <aside
      v-if="visible && graphNode"
      :id="tooltipId"
      ref="tooltip"
      class="tooltip"
      role="tooltip"
      :style="{ left: `${left}px`, top: `${top}px` }"
    >
      <strong><MinecraftText :text="displayTitle" /></strong>
      <p v-if="amountLabel">{{ amountLabel }}</p>
      <p class="state">{{ stateLabel }}</p>
      <p>{{ graphNode.detail }}</p>
      <small v-if="vanillaName">
        В обычном Minecraft: {{ vanillaName }}
      </small>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import type { CraftingGraphNodeView } from '../../../types/craftingGraph'

const props = withDefaults(defineProps<{
  node?: CraftingGraphNodeView
  visible?: boolean
  x?: number
  y?: number
  id?: string
}>(), {
  node: undefined,
  visible: false,
  x: 0,
  y: 0,
  id: ''
})

const generatedId = useId()
const tooltipId = computed(() => props.id || generatedId)
const tooltip = useTemplateRef<HTMLElement>('tooltip')
const left = ref(0)
const top = ref(0)
const graphNode = computed(() => props.node?.node)
const displayTitle = computed(() => {
  const current = graphNode.value
  if (
    current?.kind === 'method'
    && current.methodKind === 'obtain'
  ) return 'Получить в мире'
  return current?.title ?? ''
})
const amountLabel = computed(() => {
  const current = graphNode.value
  if (!current || current.kind !== 'item') return ''
  if (!current.demand.owned) return `Нужно: ${current.demand.required}`
  return `Нужно: ${current.demand.required} · Есть: ${current.demand.owned}`
})
const stateLabel = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  return {
    owned: 'Готово',
    craft: 'Нужно изготовить',
    obtain: 'Нужно получить',
    cycle: 'Путь зациклен',
    unknown: 'Путь неизвестен'
  }[current.status]
})
const vanillaName = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  if (current.kind === 'item') return current.target.vanillaName ?? ''
  if (current.kind === 'context' && current.contextKind === 'station') {
    return current.target.vanillaName ?? ''
  }
  return ''
})

watch(
  () => [props.visible, props.node?.instanceId, props.x, props.y],
  async () => {
    if (!props.visible || !import.meta.client) return
    await nextTick()
    positionTooltip()
  },
  { immediate: true }
)

function positionTooltip(): void {
  const bounds = tooltip.value?.getBoundingClientRect()
  const width = bounds?.width ?? 280
  const height = bounds?.height ?? 150
  const gap = 16
  const viewportGap = 10
  const fitsRight = props.x + gap + width <= window.innerWidth - viewportGap
  const desiredLeft = fitsRight
    ? props.x + gap
    : props.x - width - gap
  const desiredTop = props.y - Math.min(28, height / 3)

  left.value = Math.min(
    Math.max(viewportGap, desiredLeft),
    window.innerWidth - width - viewportGap
  )
  top.value = Math.min(
    Math.max(viewportGap, desiredTop),
    window.innerHeight - height - viewportGap
  )
}
</script>

<style scoped lang="scss">
.tooltip {
  position: fixed;
  z-index: 140;
  width: max-content;
  max-width: min(320px, calc(100vw - 20px));
  padding: 10px 12px;
  color: #f8f8f8;
  background: #100010;
  border: 2px solid #2a0a55;
  box-shadow:
    inset 0 0 0 2px #10002d,
    0 8px 22px rgba(0, 0, 0, 0.5);
  font-family: 'Cascadia Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
  text-shadow: 2px 2px 0 #2d2d2d;
  animation: tooltip-arrive 90ms ease-out;

  strong {
    display: block;
    font-size: 14px;
  }

  p {
    margin: 3px 0 0;
    color: #bfbfbf;
  }

  .state {
    color: #72cf69;
  }

  small {
    display: block;
    max-width: 290px;
    margin-top: 6px;
    color: #aaaaff;
    font-size: 11px;
  }
}

@keyframes tooltip-arrive {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tooltip {
    animation: none;
  }
}
</style>
