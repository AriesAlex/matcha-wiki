<template>
  <span
    class="slot"
    :class="{ large, empty }"
  >
    <img
      v-if="iconUrl"
      class="icon"
      :src="iconUrl"
      :alt="displayName"
      width="32"
      height="32"
      draggable="false"
    >
    <span
      v-else-if="!empty"
      class="fallback"
      aria-hidden="true"
    >{{ fallbackMark }}</span>
    <b
      v-if="count > 1"
      class="count"
      aria-hidden="true"
    >{{ count }}</b>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  iconUrl?: string
  displayName?: string
  fallbackMark?: string
  count?: number
  large?: boolean
  empty?: boolean
}>(), {
  iconUrl: '',
  displayName: '',
  fallbackMark: '?',
  count: 1,
  large: false,
  empty: false
})
</script>

<style scoped lang="scss">
.slot {
  position: relative;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  background: var(--slot-surface);
  box-shadow:
    inset 2px 2px 0 var(--slot-shadow),
    inset -2px -2px 0 var(--slot-highlight);

  &.large {
    width: 64px;
    height: 64px;

    .icon {
      width: 48px;
      height: 48px;
    }
  }

  &.empty {
    background: var(--slot-empty);
  }

  .icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
    user-select: none;
  }

  .fallback {
    color: #f4f4f4;
    font-size: 18px;
    font-weight: 800;
    line-height: 1;
    text-shadow: 2px 2px 0 #343434;
    user-select: none;
  }

  .count {
    position: absolute;
    right: 3px;
    bottom: 1px;
    color: #fff;
    font-size: 14px;
    line-height: 1;
    text-shadow: 2px 2px 0 #343434;
    pointer-events: none;
    user-select: none;
  }
}
</style>
