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
        :id="markerId"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="7"
        markerHeight="7"
        orient="auto"
      >
        <path d="M 0 0 L 8 4 L 0 8 Z" />
      </marker>
    </defs>

    <path
      v-for="edge in edges"
      :key="edge.id"
      class="edge"
      :class="[edge.kind, { cyclic: edge.cyclic }]"
      :d="edge.path"
      :marker-end="`url(#${markerId})`"
    />
  </svg>
</template>

<script setup lang="ts">
import type { CraftingGraphEdgeView } from '../../../types/craftingGraph'

defineProps<{
  edges: readonly CraftingGraphEdgeView[]
}>()

const markerId = `crafting-arrow-${useId().replace(/:/g, '')}`
</script>

<style scoped lang="scss">
.edges {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;

  marker path {
    fill: var(--edge);
  }

  .edge {
    fill: none;
    stroke: var(--edge);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;

    &.station,
    &.context {
      stroke-dasharray: 5 5;
    }

    &.cyclic {
      stroke: #c67b70;
      stroke-dasharray: 3 4;
    }
  }
}
</style>
