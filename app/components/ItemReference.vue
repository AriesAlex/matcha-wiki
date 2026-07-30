<template>
  <component
    :is="referenceComponent"
    v-bind="$attrs"
    class="item-reference"
    :class="{ linked: referencePath }"
    :to="referencePath || undefined"
    :tabindex="referencePath ? undefined : 0"
    :role="referencePath ? undefined : 'button'"
    :aria-describedby="visible ? tooltipId : undefined"
    :aria-expanded="referencePath ? undefined : visible"
    @pointerenter="showAtPointer"
    @pointermove="moveWithPointer"
    @pointerleave="hideOnPointerLeave"
    @pointerdown="showOnTouch"
    @focus="showAtElement"
    @blur="hide"
    @keydown.esc="hide"
  >
    <slot />
  </component>

  <Teleport to="body">
    <aside
      v-if="visible"
      :id="tooltipId"
      ref="tooltip"
      class="item-tooltip"
      role="tooltip"
      :style="{ left: `${left}px`, top: `${top}px` }"
    >
      <strong><MinecraftText :text="tooltipTitle" /></strong>
      <p
        v-for="line in tooltipLore"
        :key="line"
      >
        <MinecraftText :text="line" />
      </p>
      <template v-if="referenceEntries.length">
        <div
          v-for="entry in referenceEntries"
          :key="entry.id"
          class="identity"
        >
          <span
            v-if="referenceEntries.length > 1"
            class="variant"
          >
            {{ entry.name }}
          </span>
          <span v-if="showsVanillaAppearance(entry)">
            В обычном Minecraft выглядит как: <b>{{ entry.vanillaName }}</b>
          </span>
          <small v-if="showsObtainHint(entry)">Где искать: {{ entry.obtainHint }}</small>
        </div>
      </template>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import type {
  IngredientGlossaryEntry,
  IngredientView,
  ItemView,
  StackView
} from '../types/wiki'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  item?: ItemView
  ingredient?: IngredientView
  stack?: StackView
}>(), {
  item: undefined,
  ingredient: undefined,
  stack: undefined
})

const route = useRoute()
const catalog = useWikiCatalog()
const itemPath = computed(() => props.item ? `/items/${props.item.slug}` : '')
const referencePath = computed(() => (
  itemPath.value && normalizeWikiPath(route.path) !== itemPath.value
    ? itemPath.value
    : ''
))
const referenceComponent = computed(() => (
  referencePath.value ? resolveComponent('NuxtLink') : 'span'
))
const tooltipTitle = computed(() => (
  props.item?.title
  ?? props.ingredient?.label
  ?? props.stack?.name
  ?? 'Неизвестный предмет'
))
const tooltipLore = computed(() => props.item?.lore.slice(0, 3) ?? [])
const glossaryIds = computed(() => (
  props.ingredient?.ids
  ?? (props.stack ? [props.stack.carrier] : undefined)
  ?? (props.item ? [props.item.carrier] : [])
))
const referenceEntries = computed(() => (
  glossaryIds.value
    .map(id => catalog.ingredientGlossary[id])
    .filter(entry => entry !== undefined)
    .slice(0, 4)
))
const tooltipId = useId()
const tooltip = useTemplateRef<HTMLElement>('tooltip')
const activeTooltipId = useState<string | null>(
  'wiki:active-item-tooltip',
  () => null
)
const visible = computed(() => activeTooltipId.value === tooltipId)
const left = ref(0)
const top = ref(0)
let touchHideTimer: ReturnType<typeof setTimeout> | undefined

async function showAtPointer(event: PointerEvent): Promise<void> {
  if (event.pointerType === 'touch') return
  clearTouchHideTimer()
  activeTooltipId.value = tooltipId
  await nextTick()
  setPosition(event.clientX, event.clientY)
}

function moveWithPointer(event: PointerEvent): void {
  if (!visible.value || event.pointerType === 'touch') return
  setPosition(event.clientX, event.clientY)
}

async function showOnTouch(event: PointerEvent): Promise<void> {
  if (event.pointerType !== 'touch' || referencePath.value) return

  event.preventDefault()
  if (visible.value) {
    hide()
    return
  }

  await showAtElement(event)
  touchHideTimer = setTimeout(hide, 4_000)
}

async function showAtElement(event: Event): Promise<void> {
  const target = event.currentTarget as HTMLElement
  const bounds = target.getBoundingClientRect()
  activeTooltipId.value = tooltipId
  await nextTick()
  setPosition(bounds.right, bounds.bottom)
}

function hideOnPointerLeave(event: PointerEvent): void {
  if (event.pointerType !== 'touch') hide()
}

function setPosition(anchorX: number, anchorY: number): void {
  const bounds = tooltip.value?.getBoundingClientRect()
  const width = bounds?.width ?? 300
  const height = bounds?.height ?? 130
  const right = anchorX + width + 18
  const bottom = anchorY + height + 20

  left.value = right > window.innerWidth - 10
    ? Math.max(10, anchorX - width - 14)
    : anchorX + 18
  top.value = bottom > window.innerHeight - 10
    ? Math.max(10, anchorY - height - 14)
    : anchorY + 20
}

function hide(): void {
  clearTouchHideTimer()
  if (activeTooltipId.value === tooltipId) {
    activeTooltipId.value = null
  }
}

function clearTouchHideTimer(): void {
  if (touchHideTimer !== undefined) {
    clearTimeout(touchHideTimer)
    touchHideTimer = undefined
  }
}

function showsVanillaAppearance(entry: IngredientGlossaryEntry): boolean {
  return Boolean(entry.vanillaName) && (
    props.item?.isCustom === true
    || entry.vanillaName !== entry.name
  )
}

function showsObtainHint(entry: IngredientGlossaryEntry): boolean {
  return Boolean(entry.obtainHint) && props.item?.isCustom !== true
}

onBeforeUnmount(hide)
</script>

<style scoped lang="scss">
.item-reference {
  color: inherit;
  text-decoration: none;

  &.linked:hover,
  &.linked:focus-visible {
    color: var(--accent);
  }
}

.item-tooltip {
  position: fixed;
  z-index: 120;
  width: max-content;
  max-width: min(320px, calc(100vw - 20px));
  padding: 10px 12px;
  color: #f8f8f8;
  background: #100010;
  border: 2px solid #2a0a55;
  box-shadow:
    inset 0 0 0 2px #10002d,
    0 6px 18px rgba(0, 0, 0, 0.45);
  font-family: 'Cascadia Mono', monospace;
  font-size: 13px;
  line-height: 1.35;
  pointer-events: none;
  text-shadow: 2px 2px 0 #2d2d2d;
  animation: tooltip-arrive 90ms ease-out;

  strong,
  small {
    display: block;
  }

  strong {
    color: #fff;
    font-size: 14px;
  }

  p {
    margin: 3px 0 0;
    color: #bfbfbf;
  }

  .identity {
    margin-top: 6px;

    span,
    small {
      display: block;
    }

    span {
      color: #bfbfbf;
    }

    .variant {
      margin-bottom: 2px;
      color: #fff;
      font-weight: 700;
    }

    b {
      color: #fff;
    }
  }

  small {
    max-width: 290px;
    margin-top: 4px;
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
</style>
