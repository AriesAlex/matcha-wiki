<template>
  <span class="copy">
    <strong>{{ option.title }}</strong>
    <small>{{ option.detail }}</small>
  </span>
</template>

<script setup lang="ts">
import type { CraftingGraphAlternativeOption } from '../../../types/craftingGraph'

defineProps<{
  option: CraftingGraphAlternativeOption
}>()
</script>

<style scoped lang="scss">
.copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong,
  small {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    white-space: normal;
    -webkit-box-orient: vertical;
  }

  strong {
    font-size: 12px;
    line-height: 1.2;
    -webkit-line-clamp: 2;
  }

  small {
    color: var(--muted);
    font-size: 9px;
    line-height: 1.25;
    -webkit-line-clamp: 4;
  }
}
</style>
