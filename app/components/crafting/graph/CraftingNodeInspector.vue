<template>
  <Transition name="inspector">
    <aside
      v-if="open && graphNode"
      id="crafting-node-inspector"
      ref="inspector"
      class="inspector"
      :role="mobileOpen ? 'dialog' : 'region'"
      :aria-modal="mobileOpen ? 'true' : undefined"
      :aria-label="`Детали: ${plainTitle}`"
      data-crafting-wheel-pass-through
      tabindex="-1"
    >
      <header>
        <div class="heading">
          <span class="icon" aria-hidden="true">
            <img
              v-if="iconUrl"
              :src="iconUrl"
              alt=""
              width="42"
              height="42"
              draggable="false"
            >
            <component
              :is="kindIcon"
              v-else
              :size="24"
              weight="bold"
            />
          </span>
          <div>
            <p>{{ kindLabel }}</p>
            <h3><MinecraftText :text="graphNode.title" /></h3>
          </div>
        </div>
        <button
          ref="closeButton"
          type="button"
          aria-label="Закрыть детали"
          title="Закрыть детали"
          @click="emit('close')"
        >
          <PhX :size="20" aria-hidden="true" />
        </button>
      </header>

      <p v-if="detailText" class="detail">{{ detailText }}</p>

      <CraftingInspectorItem
        v-if="graphNode.kind === 'item'"
        :node="graphNode"
        :complete="complete"
        @select-recipe="emit('select-recipe', $event)"
      />
      <CraftingInspectorRecipe
        v-else-if="graphNode.kind === 'recipe'"
        :node="graphNode"
        @select-recipe="emit('select-recipe', $event)"
      />
      <CraftingInspectorAlternatives
        v-else-if="graphNode.kind === 'alternatives'"
        :node="graphNode"
        @select-option="emit('select-option', $event)"
      />

      <NuxtLink
        v-if="detailsPath"
        class="open"
        :to="detailsPath"
      >
        {{ detailsLabel }}
        <PhArrowSquareOut :size="18" aria-hidden="true" />
      </NuxtLink>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import {
  PhArrowSquareOut,
  PhArrowsSplit,
  PhHammer,
  PhMapPin,
  PhPawPrint,
  PhQuestion,
  PhStorefront,
  PhX
} from '@phosphor-icons/vue'
import { useMediaQuery } from '@vueuse/core'
import type { Component } from 'vue'
import CraftingInspectorAlternatives from './CraftingInspectorAlternatives.vue'
import CraftingInspectorItem from './CraftingInspectorItem.vue'
import CraftingInspectorRecipe from './CraftingInspectorRecipe.vue'
import type { CraftingGraphNodeView } from '../../../types/craftingGraph'

interface RecipeSelection {
  targetKey: string
  recipeId: string
}

interface OptionSelection {
  requirementKey: string
  targetKey: string
}

const props = withDefaults(defineProps<{
  node?: CraftingGraphNodeView
  open?: boolean
  complete?: boolean
}>(), {
  node: undefined,
  open: true,
  complete: false
})

const emit = defineEmits<{
  close: []
  'select-recipe': [payload: RecipeSelection]
  'select-option': [payload: OptionSelection]
}>()

const route = useRoute()
const inspector = useTemplateRef<HTMLElement>('inspector')
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton')
const isMobile = useMediaQuery('(max-width: 720px)')
const graphNode = computed(() => props.node?.node)
const mobileOpen = computed(() => (
  Boolean(props.open && graphNode.value && isMobile.value)
))
useModalFocusTrap(inspector, mobileOpen, closeButton, {
  inertOutside: true
})
const plainTitle = computed(() => (
  graphNode.value ? stripMinecraftFormatting(graphNode.value.title) : ''
))
const detailText = computed(() => {
  const current = graphNode.value
  if (!current || current.kind === 'alternatives') return ''
  if (current.kind === 'item' && props.complete) {
    return 'Этот предмет уже отмечен как готовый; его ветка больше не нужна.'
  }
  return current.kind === 'source' ? current.source.detail : current.detail
})
const iconUrl = computed(() => {
  const current = graphNode.value
  return current?.kind === 'item' && current.target.icon
    ? useAssetPath(current.target.icon)
    : ''
})
const kindLabel = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  if (current.kind === 'item') return 'Предмет'
  if (current.kind === 'recipe') return 'Как изготовить'
  if (current.kind === 'alternatives') {
    return current.alternativeKind === 'source'
      ? 'Где получить'
      : 'Выбор материала'
  }
  return sourceKindLabel(current.source.kind)
})
const kindIcon = computed<Component>(() => {
  const current = graphNode.value
  if (!current || current.kind === 'item') return PhQuestion
  if (current.kind === 'recipe') return PhHammer
  if (current.kind === 'alternatives') {
    return current.alternativeKind === 'source' ? PhMapPin : PhArrowsSplit
  }
  return {
    location: PhMapPin,
    mob: PhPawPrint,
    trader: PhStorefront
  }[current.source.kind]
})
const detailsPath = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  const path = current.kind === 'item'
    ? current.itemPagePath
    : current.kind === 'recipe'
      ? current.detailsPath
      : current.kind === 'source'
        ? current.source.path
        : undefined

  return path && normalizeWikiPath(route.path) !== normalizeWikiPath(path)
    ? path
    : ''
})
const detailsLabel = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  if (current.kind === 'item') return 'Открыть страницу предмета'
  if (current.kind === 'recipe') return 'Открыть полный рецепт'
  if (current.kind !== 'source') return ''
  return {
    location: 'Подробнее об этом месте',
    mob: 'Подробнее об этом существе',
    trader: 'Подробнее об этом торговце'
  }[current.source.kind]
})

function sourceKindLabel(kind: 'location' | 'mob' | 'trader'): string {
  return {
    location: 'Где искать',
    mob: 'С кого выпадает',
    trader: 'У кого обменять'
  }[kind]
}
</script>

<style scoped lang="scss">
.inspector {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 8;
  width: min(350px, calc(100% - 24px));
  overflow: auto;
  padding: 18px;
  color: var(--ink);
  background: color-mix(in srgb, var(--surface) 97%, transparent);
  border: 1px solid var(--edge);
  box-shadow: 0 14px 38px var(--shadow);
  overscroll-behavior: contain;
  touch-action: pan-y;

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;

    .heading {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 11px;

      .icon {
        width: 48px;
        height: 48px;
        flex: none;
        display: grid;
        place-items: center;
        color: var(--accent);
        background: color-mix(in srgb, var(--accent) 9%, transparent);

        img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          image-rendering: pixelated;
        }
      }

      p {
        margin: 0 0 2px;
        color: var(--accent);
        font-family: 'Tiny5', monospace;
        font-size: 14px;
      }

      h3 {
        overflow-wrap: anywhere;
        font-size: 19px;
      }
    }

    > button {
      width: 44px;
      height: 44px;
      flex: none;
      display: grid;
      place-items: center;
      padding: 0;
      color: var(--muted);
      background: transparent;
      border: 0;

      &:hover,
      &:focus-visible {
        color: var(--ink);
        background: var(--surface-quiet);
      }
    }
  }

  .detail {
    margin: 16px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .open {
    width: 100%;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 22px;
    padding: 9px 12px;
    color: var(--accent);
    border: 1px solid var(--accent);
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;

    &:hover,
    &:focus-visible {
      color: var(--accent-ink);
      background: var(--surface-quiet);
    }
  }
}

.inspector-enter-active,
.inspector-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.inspector-enter-from,
.inspector-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

@media (max-width: 720px) {
  .inspector {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    max-height: min(76dvh, 680px);
    padding:
      18px
      max(18px, env(safe-area-inset-right))
      max(18px, env(safe-area-inset-bottom))
      max(18px, env(safe-area-inset-left));
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    z-index: 130;
  }

  .inspector-enter-from,
  .inspector-leave-to {
    transform: translateY(12px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .inspector-enter-active,
  .inspector-leave-active {
    transition: none;
  }
}
</style>
