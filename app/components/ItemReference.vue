<template>
  <component
    :is="referenceComponent"
    v-bind="$attrs"
    class="item-reference"
    :class="{ linked: referencePath }"
    :to="referencePath || undefined"
    :tabindex="referencePath ? undefined : 0"
    :role="referencePath ? undefined : 'note'"
    :aria-describedby="visible ? tooltipId : undefined"
    @pointerenter="showAtPointer"
    @pointermove="moveWithPointer"
    @pointerleave="hide"
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
      <template v-if="ingredientEntries.length">
        <div
          v-for="entry in ingredientEntries"
          :key="entry.id"
          class="identity"
        >
          <span v-if="entry.vanillaName && entry.vanillaName !== entry.name">
            В обычном Minecraft: <b>{{ entry.vanillaName }}</b>
          </span>
          <span v-else>Ванильный предмет: <b>{{ entry.name }}</b></span>
          <code>{{ entry.id }}</code>
          <small v-if="entry.obtainHint">{{ entry.obtainHint }}</small>
        </div>
      </template>
      <template v-else-if="item">
        <code>{{ item.model ?? item.carrier }}</code>
        <small v-if="item.model">
          Техническая основа: {{ itemBaseName }} · {{ item.carrier }}
        </small>
        <small v-else>Вариант задаётся components</small>
      </template>
      <code v-else-if="stack">{{ stack.carrier }}</code>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import type { IngredientView, ItemView, StackView } from '../types/wiki'

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
  props.ingredient?.ids ?? (props.stack ? [props.stack.carrier] : [])
))
const ingredientEntries = computed(() => (
  glossaryIds.value
    .map(id => catalog.ingredientGlossary[id])
    .filter(entry => entry !== undefined)
    .slice(0, 4)
))
const itemBaseName = computed(() => (
  props.item
    ? catalog.ingredientGlossary[props.item.carrier]?.vanillaName ?? props.item.carrier
    : ''
))
const tooltipId = useId()
const tooltip = useTemplateRef<HTMLElement>('tooltip')
const visible = ref(false)
const left = ref(0)
const top = ref(0)

async function showAtPointer(event: PointerEvent): Promise<void> {
  if (event.pointerType === 'touch') return
  visible.value = true
  await nextTick()
  setPosition(event.clientX, event.clientY)
}

function moveWithPointer(event: PointerEvent): void {
  if (!visible.value || event.pointerType === 'touch') return
  setPosition(event.clientX, event.clientY)
}

async function showAtElement(event: FocusEvent): Promise<void> {
  const target = event.currentTarget as HTMLElement
  const bounds = target.getBoundingClientRect()
  visible.value = true
  await nextTick()
  setPosition(bounds.right, bounds.bottom)
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
  visible.value = false
}
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

  strong,
  code,
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
    code,
    small {
      display: block;
    }

    span {
      color: #bfbfbf;
    }

    b {
      color: #fff;
    }
  }

  code {
    margin-top: 5px;
    color: #aaa;
    font-size: 11px;
  }

  small {
    margin-top: 2px;
    color: #aaaaff;
    font-size: 11px;
  }
}
</style>
