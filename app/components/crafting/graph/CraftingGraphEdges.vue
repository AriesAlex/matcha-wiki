<template>
  <svg
    class="edges"
    width="100%"
    height="100%"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <marker
        v-for="variant in markerVariants"
        :id="variant.id"
        :key="variant.name"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="7"
        markerHeight="7"
        orient="auto"
      >
        <path
          :class="variant.name"
          d="M 0 0 L 8 4 L 0 8 Z"
        />
      </marker>
    </defs>

    <path
      v-for="edge in edges"
      :key="edge.id"
      class="edge"
      :class="[
        edge.kind,
        {
          cyclic: edge.cyclic,
          inactive: inactiveIds.has(edge.id),
          highlighted: isHighlighted(edge)
        }
      ]"
      :d="edge.path"
      :marker-end="`url(#${markerFor(edge)})`"
    />
  </svg>
</template>

<script setup lang="ts">
import type { CraftingGraphEdgeView } from '../../../types/craftingGraph'

const props = withDefaults(defineProps<{
  edges: readonly CraftingGraphEdgeView[]
  highlightedNodeId?: string
  inactiveEdgeIds?: readonly string[]
}>(), {
  highlightedNodeId: '',
  inactiveEdgeIds: () => []
})

const markerBase = `crafting-arrow-${useId().replaceAll(':', '')}`
const markerVariants = [
  { name: 'default', id: `${markerBase}-default` },
  { name: 'inactive', id: `${markerBase}-inactive` },
  { name: 'highlighted', id: `${markerBase}-highlighted` }
] as const
const inactiveIds = computed(() => new Set(props.inactiveEdgeIds))

function isHighlighted(edge: CraftingGraphEdgeView): boolean {
  return Boolean(props.highlightedNodeId)
    && (
      edge.from === props.highlightedNodeId
      || edge.to === props.highlightedNodeId
    )
}

function markerFor(edge: CraftingGraphEdgeView): string {
  if (isHighlighted(edge)) return `${markerBase}-highlighted`
  if (inactiveIds.value.has(edge.id)) return `${markerBase}-inactive`
  return `${markerBase}-default`
}
</script>

<style scoped lang="scss">
.edges {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;

  marker path {
    &.default {
      fill: var(--edge);
    }

    &.inactive {
      fill: color-mix(in srgb, var(--edge) 34%, transparent);
    }

    &.highlighted {
      fill: color-mix(in srgb, var(--ink) 92%, var(--accent));
    }
  }

  .edge {
    fill: none;
    stroke: var(--edge);
    stroke-width: 2;
    opacity: 0.68;
    transition:
      stroke 120ms ease,
      stroke-width 120ms ease,
      opacity 120ms ease;
    vector-effect: non-scaling-stroke;

    &.alternative,
    &.source {
      stroke-dasharray: 5 5;
    }

    &.cyclic {
      stroke: #c67b70;
      stroke-dasharray: 3 4;
    }

    &.inactive {
      opacity: 0.2;
    }

    &.highlighted {
      stroke: color-mix(in srgb, var(--ink) 92%, var(--accent));
      stroke-width: 3;
      opacity: 1;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .edges .edge {
    transition: none;
  }
}
</style>
