<template>
  <span class="icon" aria-hidden="true">
    <img
      v-if="iconUrl"
      :src="iconUrl"
      alt=""
      width="36"
      height="36"
      draggable="false"
    >
    <span v-else>?</span>
  </span>
</template>

<script setup lang="ts">
import type { CraftingGraphAlternativeOption } from '../../../types/craftingGraph'

const props = defineProps<{
  option: CraftingGraphAlternativeOption
}>()

const iconUrl = computed(() => (
  props.option.icon ? useAssetPath(props.option.icon) : ''
))
</script>

<style scoped lang="scss">
.icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 8%, transparent);

  img {
    width: 36px;
    height: 36px;
    object-fit: contain;
    image-rendering: pixelated;
    user-select: none;
  }

  > span {
    color: var(--muted);
    font-size: 16px;
    font-weight: 800;
  }
}
</style>
