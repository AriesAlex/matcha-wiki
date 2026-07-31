<template>
  <article
    class="frame"
    :class="{ selected, complete, inactive, root }"
  >
    <button
      class="body"
      type="button"
      :aria-label="accessibleName"
      :aria-expanded="selected"
      aria-controls="crafting-node-inspector"
      @click="emit('open-details')"
    >
      <slot />
    </button>

    <button
      v-if="toggleable"
      class="check"
      type="button"
      :aria-label="toggleLabel"
      :aria-pressed="complete"
      :title="toggleLabel"
      @click.stop="emit('toggle')"
    >
      <PhCheckCircle
        v-if="complete"
        :size="26"
        weight="fill"
        aria-hidden="true"
      />
      <PhCircle
        v-else
        :size="26"
        aria-hidden="true"
      />
    </button>
  </article>
</template>

<script setup lang="ts">
import {
  PhCheckCircle,
  PhCircle
} from '@phosphor-icons/vue'

const props = withDefaults(defineProps<{
  accessibleName: string
  title: string
  selected?: boolean
  complete?: boolean
  inactive?: boolean
  root?: boolean
  toggleable?: boolean
}>(), {
  selected: false,
  complete: false,
  inactive: false,
  root: false,
  toggleable: false
})

const emit = defineEmits<{
  'open-details': []
  toggle: []
}>()

const toggleLabel = computed(() => (
  props.complete
    ? `Снова нужен предмет «${props.title}»`
    : `Предмет «${props.title}» уже есть`
))
</script>

<style scoped lang="scss">
.frame {
  position: relative;
  width: 100%;
  height: 100%;
  color: var(--ink);
  transition:
    opacity 150ms ease,
    filter 150ms ease;

  .body {
    width: 100%;
    height: 100%;
    min-width: 0;
    display: block;
    overflow: hidden;
    padding: 0;
    color: inherit;
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    border: 1px solid var(--edge);
    box-shadow: 0 8px 22px var(--shadow);
    text-align: left;

    &:hover,
    &:focus-visible {
      background: color-mix(in srgb, var(--surface-quiet) 76%, var(--surface));
    }
  }

  &.selected .body {
    border-color: var(--accent);
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--accent) 36%, transparent),
      0 8px 22px var(--shadow);
  }

  &.root .body {
    border-width: 2px;
  }

  &.complete .body {
    background: color-mix(in srgb, var(--accent) 9%, var(--surface));
  }

  &.inactive {
    opacity: 0.3;
    filter: grayscale(0.82);

    &:hover,
    &:focus-within {
      opacity: 0.7;
    }
  }

  .check {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    color: var(--muted);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    border: 1px solid transparent;

    &:hover,
    &:focus-visible {
      color: var(--ink);
      border-color: var(--accent);
    }

    &[aria-pressed='true'] {
      color: var(--accent);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .frame {
    transition: none;
  }
}
</style>
