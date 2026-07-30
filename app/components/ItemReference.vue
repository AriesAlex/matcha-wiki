<template>
  <NuxtLink
    v-bind="$attrs"
    class="item-reference"
    :to="`/items/${item.slug}`"
    :aria-describedby="visible ? tooltipId : undefined"
    @pointerenter="showAtPointer"
    @pointermove="moveWithPointer"
    @pointerleave="hide"
    @focus="showAtElement"
    @blur="hide"
    @keydown.esc="hide"
  >
    <slot />
  </NuxtLink>

  <Teleport to="body">
    <aside
      v-if="visible"
      :id="tooltipId"
      ref="tooltip"
      class="item-tooltip"
      role="tooltip"
      :style="{ left: `${left}px`, top: `${top}px` }"
    >
      <strong><MinecraftText :text="item.title" /></strong>
      <p
        v-for="line in item.lore.slice(0, 3)"
        :key="line"
      >
        <MinecraftText :text="line" />
      </p>
      <code>{{ item.model ?? item.carrier }}</code>
      <small v-if="item.model">Основа: {{ item.carrier }}</small>
      <small v-else>Вариант задаётся components</small>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import type { ItemView } from '../types/wiki'

defineOptions({
  inheritAttrs: false
})

defineProps<{
  item: ItemView
}>()

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

  &:hover,
  &:focus-visible {
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

  code {
    margin-top: 5px;
    color: #aaa;
    font-size: 11px;
  }

  small {
    margin-top: 2px;
    color: #5555ff;
    font-size: 11px;
  }
}
</style>
