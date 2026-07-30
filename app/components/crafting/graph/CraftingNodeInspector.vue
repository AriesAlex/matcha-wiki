<template>
  <Transition name="inspector">
    <aside
      v-if="open && graphNode"
      class="inspector"
      role="region"
      :aria-label="`Детали: ${plainTitle}`"
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
            <h3><MinecraftText :text="displayTitle" /></h3>
          </div>
        </div>
        <button
          type="button"
          aria-label="Закрыть детали"
          title="Закрыть детали"
          @click="emit('close')"
        >
          <PhX :size="20" aria-hidden="true" />
        </button>
      </header>

      <p class="detail">{{ graphNode.detail }}</p>

      <CraftingInspectorItem
        v-if="graphNode.kind === 'item'"
        :node="graphNode"
        :complete="complete"
        :mode="mode"
        :selected-recipe-id="selectedRecipeId"
        @toggle-subtree="emit('toggle-subtree', $event)"
        @select-mode="emit('select-mode', $event)"
        @select-recipe="emit('select-recipe', $event)"
      />
      <CraftingInspectorMethod
        v-else-if="graphNode.kind === 'method'"
        :node="graphNode"
        :selected-recipe-id="selectedRecipeId"
        @select-recipe="emit('select-recipe', $event)"
      />
      <CraftingInspectorContext
        v-else
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
  PhQuestion,
  PhWarning,
  PhWrench,
  PhX
} from '@phosphor-icons/vue'
import type { Component } from 'vue'
import CraftingInspectorContext from './CraftingInspectorContext.vue'
import CraftingInspectorItem from './CraftingInspectorItem.vue'
import CraftingInspectorMethod from './CraftingInspectorMethod.vue'
import type { CraftingMode } from '../../../types/crafting'
import type {
  CraftingGraphMethodNode,
  CraftingGraphNodeView
} from '../../../types/craftingGraph'

interface ModeSelection {
  targetKey: string
  mode: CraftingMode
}

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
  mode?: CraftingMode
  selectedRecipeId?: string
}>(), {
  node: undefined,
  open: true,
  complete: false,
  mode: undefined,
  selectedRecipeId: ''
})

const emit = defineEmits<{
  close: []
  'toggle-subtree': [instanceId: string]
  'select-mode': [payload: ModeSelection]
  'select-recipe': [payload: RecipeSelection]
  'select-option': [payload: OptionSelection]
}>()

const route = useRoute()
const graphNode = computed(() => props.node?.node)
const plainTitle = computed(() => (
  graphNode.value
    ? stripMinecraftFormatting(displayTitle.value)
    : ''
))
const displayTitle = computed(() => {
  const current = graphNode.value
  if (
    current?.kind === 'method'
    && current.methodKind === 'obtain'
  ) return 'Получить в мире'
  return current?.title ?? ''
})
const iconUrl = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  if (current.kind === 'item' && current.target.icon) {
    return useAssetPath(current.target.icon)
  }
  if (
    current.kind === 'context'
    && current.contextKind === 'station'
    && current.target.icon
  ) {
    return useAssetPath(current.target.icon)
  }
  return ''
})
const kindLabel = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  if (current.kind === 'item') return 'Предмет'
  if (current.kind === 'method') {
    return current.methodKind === 'recipe'
      ? 'Способ изготовления'
      : 'Способ получения'
  }
  if (current.contextKind === 'choice') return 'Выбор материала'
  return current.contextKind === 'source' ? 'Источник' : 'Рабочее место'
})
const kindIcon = computed<Component>(() => {
  const current = graphNode.value
  if (!current || current.kind === 'item') return PhQuestion
  if (current.kind === 'context') {
    if (current.contextKind === 'choice') return PhArrowsSplit
    return current.contextKind === 'source' ? PhMapPin : PhWrench
  }
  return methodIcon(current)
})
const detailsPath = computed(() => {
  const current = graphNode.value
  if (!current) return ''
  const path = current.kind === 'item' || current.kind === 'method'
    ? current.detailsPath
    : current.contextKind === 'source'
      ? current.source.path
      : current.contextKind === 'station' && current.target.item
        ? `/items/${current.target.item.slug}`
        : undefined

  return path && normalizeWikiPath(route.path) !== normalizeWikiPath(path)
    ? path
    : ''
})
const detailsLabel = computed(() => (
  graphNode.value?.kind === 'method'
    ? 'Показать схему рецепта'
    : graphNode.value?.kind === 'context'
      && graphNode.value.contextKind === 'source'
      ? 'Открыть источник'
      : 'Открыть страницу предмета'
))

function methodIcon(node: CraftingGraphMethodNode): Component {
  return {
    recipe: PhHammer,
    obtain: PhMapPin,
    unknown: PhQuestion,
    cycle: PhWarning
  }[node.methodKind]
}
</script>

<style scoped lang="scss">
.inspector {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 5;
  width: min(350px, calc(100% - 24px));
  overflow: auto;
  padding: 18px;
  color: var(--ink);
  background: color-mix(in srgb, var(--surface) 97%, transparent);
  border: 1px solid var(--edge);
  box-shadow: 0 14px 38px var(--shadow);
  overscroll-behavior: contain;

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

@media (max-width: 620px) {
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
