<template>
  <div
    class="controls"
    role="toolbar"
    aria-label="Управление схемой изготовления"
  >
    <div class="zoom">
      <button
        type="button"
        aria-label="Уменьшить масштаб"
        title="Уменьшить масштаб"
        :disabled="!canZoomOut"
        @click="emit('zoom-out')"
      >
        <PhMagnifyingGlassMinus :size="20" aria-hidden="true" />
      </button>
      <output :aria-label="`Масштаб ${scaleLabel}`">
        {{ scaleLabel }}
      </output>
      <button
        type="button"
        aria-label="Увеличить масштаб"
        title="Увеличить масштаб"
        :disabled="!canZoomIn"
        @click="emit('zoom-in')"
      >
        <PhMagnifyingGlassPlus :size="20" aria-hidden="true" />
      </button>
    </div>

    <button
      type="button"
      aria-label="Вписать всю схему"
      title="Вписать всю схему"
      @click="emit('fit')"
    >
      <PhCornersOut :size="20" aria-hidden="true" />
    </button>
    <button
      type="button"
      aria-label="Перейти к итоговому предмету"
      title="К итоговому предмету"
      @click="emit('focus-root')"
    >
      <PhTarget :size="20" aria-hidden="true" />
    </button>
    <button
      v-if="canFullscreen"
      type="button"
      :aria-label="fullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран'"
      :title="fullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран'"
      :aria-pressed="fullscreen"
      @click="emit('toggle-fullscreen')"
    >
      <PhArrowsIn
        v-if="fullscreen"
        :size="20"
        aria-hidden="true"
      />
      <PhArrowsOut
        v-else
        :size="20"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  PhArrowsIn,
  PhArrowsOut,
  PhCornersOut,
  PhMagnifyingGlassMinus,
  PhMagnifyingGlassPlus,
  PhTarget
} from '@phosphor-icons/vue'

const props = withDefaults(defineProps<{
  scale: number
  fullscreen?: boolean
  canFullscreen?: boolean
  canZoomIn?: boolean
  canZoomOut?: boolean
}>(), {
  fullscreen: false,
  canFullscreen: true,
  canZoomIn: true,
  canZoomOut: true
})

const emit = defineEmits<{
  'zoom-in': []
  'zoom-out': []
  fit: []
  'focus-root': []
  'toggle-fullscreen': []
}>()

const scaleLabel = computed(() => `${Math.round(props.scale * 100)}%`)
</script>

<style scoped lang="scss">
.controls {
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  color: var(--ink);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  border: 1px solid var(--edge);
  box-shadow: 0 8px 24px var(--shadow);

  button {
    width: 44px;
    height: 44px;
    display: inline-grid;
    place-items: center;
    padding: 0;
    color: var(--muted);
    background: transparent;
    border: 0;

    &:hover,
    &:focus-visible,
    &[aria-pressed='true'] {
      color: var(--ink);
      background: var(--surface-quiet);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  .zoom {
    display: flex;
    align-items: center;
    border-right: 1px solid var(--edge);

    output {
      width: 54px;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }
  }
}

@media (max-width: 620px) {
  .controls {
    max-width: calc(100vw - 24px);
    overflow-x: auto;
    overscroll-behavior-x: contain;

    button {
      flex: none;
    }
  }
}
</style>
