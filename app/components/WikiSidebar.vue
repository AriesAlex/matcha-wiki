<template>
  <aside
    id="site-sidebar"
    ref="sidebar"
    class="site-sidebar"
    :class="{ open }"
    :role="modalOpen ? 'dialog' : undefined"
    :aria-modal="modalOpen ? 'true' : undefined"
    aria-label="Навигация по вики"
    :tabindex="modalOpen ? -1 : undefined"
    @keydown.esc.stop="emit('close')"
  >
    <WikiSidebarRelease />
    <WikiSidebarNavigation :active-heading-id="activeHeadingId" />
  </aside>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const sidebar = useTemplateRef<HTMLElement>('sidebar')
const compactLayout = useMediaQuery('(max-width: 1050px)')
const modalOpen = computed(() => props.open && compactLayout.value)
const initialFocus = computed(() => (
  sidebar.value?.querySelector<HTMLElement>('a[href], button:not([disabled])')
  ?? sidebar.value
))

useModalFocusTrap(sidebar, modalOpen, initialFocus)

const { activeHeadingId } = useWikiSidebarActiveHeadingReveal(
  sidebar,
  () => props.open
)
</script>

<style scoped lang="scss">
.site-sidebar {
  align-self: start;
  position: sticky;
  top: 86px;
  max-height: calc(100dvh - 102px);
  overflow-y: auto;
  padding: 12px 10px 20px 0;
  scrollbar-gutter: stable;
}

@media (max-width: 1050px) {
  .site-sidebar {
    position: fixed;
    inset: 64px auto auto 0;
    z-index: 35;
    width: min(360px, 92vw);
    height: calc(100dvh - 64px);
    max-height: calc(100dvh - 64px);
    overflow-y: auto;
    overscroll-behavior-y: contain;
    padding: 28px 24px 48px;
    background: var(--surface);
    box-shadow: 24px 0 60px var(--shadow);
    touch-action: pan-y;
    transform: translateX(-110%);
    transition: transform 180ms ease;
    visibility: hidden;
    pointer-events: none;
    -webkit-overflow-scrolling: touch;

    &.open {
      transform: translateX(0);
      visibility: visible;
      pointer-events: auto;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .site-sidebar {
    transition: none;
  }
}
</style>
