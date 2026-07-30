<template>
  <component
    :is="`h${level}`"
    :id="id"
    class="wiki-heading"
  >
    <a
      v-if="id"
      class="heading-link"
      :class="{ copied }"
      :href="`#${id}`"
      :title="copied ? 'Ссылка скопирована' : 'Скопировать ссылку на раздел'"
      @click="copyPermalink"
    >
      <span><slot /></span>
      <PhCheck
        v-if="copied"
        class="heading-icon"
        :size="20"
        weight="bold"
        aria-hidden="true"
      />
      <PhLinkSimple
        v-else
        class="heading-icon"
        :size="20"
        weight="bold"
        aria-hidden="true"
      />
    </a>
    <slot v-else />
    <span class="visually-hidden" aria-live="polite">
      {{ copied ? 'Ссылка на раздел скопирована' : '' }}
    </span>
  </component>
</template>

<script setup lang="ts">
import { PhCheck, PhLinkSimple } from '@phosphor-icons/vue'

const props = defineProps<{
  id?: string
  level: 2 | 3 | 4
}>()

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
})

function copyPermalink(event: MouseEvent): void {
  if (!props.id || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return
  }

  const url = new URL(window.location.href)
  url.hash = props.id
  const field = document.createElement('textarea')
  field.value = url.href
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  document.execCommand('copy')
  field.remove()

  try {
    const clipboardWrite = navigator.clipboard?.writeText(url.href)
    if (clipboardWrite) {
      void clipboardWrite.catch(() => undefined)
    }
  } catch {
    // The synchronous copy above preserves the click's user activation.
  }

  markCopied()
}

function markCopied(): void {
  copied.value = true
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    copied.value = false
  }, 1800)
}
</script>

<style scoped lang="scss">
.wiki-heading {
  .heading-link {
    width: fit-content;
    max-width: 100%;
    display: inline-flex;
    align-items: baseline;
    gap: 0.35em;
    color: inherit;
    text-decoration: none;

    &:hover,
    &:focus-visible,
    &.copied {
      color: var(--accent);

      .heading-icon {
        opacity: 1;
        transform: translateX(0);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 4px;
    }
  }

  .heading-icon {
    flex: none;
    opacity: 0;
    transform: translateX(-4px);
    transition:
      opacity 120ms ease,
      transform 120ms ease;
  }
}

@media (hover: none) {
  .wiki-heading .heading-icon {
    opacity: 0.65;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wiki-heading .heading-icon {
    transition: none;
  }
}
</style>
