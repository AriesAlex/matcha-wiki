<template>
  <aside
    id="site-sidebar"
    ref="sidebar"
    class="site-sidebar"
    :class="{ open }"
    @keydown.esc="emit('close')"
  >
    <nav aria-label="Разделы вики">
      <section
        v-for="(section, sectionIndex) in wikiNavigation"
        :key="section.label"
        class="nav-section"
      >
        <p :id="`wiki-nav-section-${sectionIndex}`">{{ section.label }}</p>
        <ul
          role="list"
          :aria-labelledby="`wiki-nav-section-${sectionIndex}`"
        >
          <li
            v-for="link in section.links"
            :key="link.to"
            class="nav-entry"
          >
            <div class="nav-row">
              <NuxtLink
                class="nav-link"
                :class="{ branch: isBranchActive(link) }"
                :to="link.to"
              >
                {{ link.label }}
              </NuxtLink>
              <button
                v-if="hasExpandableContent(link)"
                class="disclosure"
                type="button"
                :class="{ expanded: isExpanded(link.to) }"
                :aria-expanded="isExpanded(link.to)"
                :aria-controls="panelId(link.to)"
                :aria-label="disclosureLabel(link)"
                @click="toggleExpanded(link.to)"
              >
                <PhCaretRight :size="17" weight="bold" aria-hidden="true" />
              </button>
            </div>

            <div
              v-if="hasExpandableContent(link)"
              v-show="isExpanded(link.to)"
              :id="panelId(link.to)"
              class="branch-panel"
            >
              <WikiArticleToc
                v-if="headingsFor(link.to).length"
                :active-id="activeHeadingId"
                :links="headingsFor(link.to)"
                :path="link.to"
              />

              <ul v-if="link.children?.length" class="nav-children">
                <li v-for="child in link.children" :key="child.to">
                  <div class="nav-row child-row">
                    <NuxtLink
                      class="nav-link"
                      :class="{ branch: isBranchActive(child) }"
                      :to="child.to"
                    >
                      {{ child.label }}
                    </NuxtLink>
                    <button
                      v-if="hasExpandableContent(child)"
                      class="disclosure"
                      type="button"
                      :class="{ expanded: isExpanded(child.to) }"
                      :aria-expanded="isExpanded(child.to)"
                      :aria-controls="panelId(child.to)"
                      :aria-label="disclosureLabel(child)"
                      @click="toggleExpanded(child.to)"
                    >
                      <PhCaretRight :size="15" weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                  <WikiArticleToc
                    v-if="headingsFor(child.to).length"
                    v-show="isExpanded(child.to)"
                    :id="panelId(child.to)"
                    :active-id="activeHeadingId"
                    :links="headingsFor(child.to)"
                    :path="child.to"
                  />
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </section>
    </nav>

    <div class="sidebar-release">
      <PhTranslate :size="20" aria-hidden="true" />
      <div>
        <strong>Русский форк ArieX</strong>
        <p>
          Ручная локализация и проверенные исправления. Один ZIP работает как
          data pack и resource pack.
        </p>
        <span class="release-links">
          <NuxtLink to="/fork">Что изменено</NuxtLink>
          <a href="https://github.com/AriesAlex/matcha-wiki/releases/latest">Скачать ZIP</a>
        </span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { PhCaretRight, PhTranslate } from '@phosphor-icons/vue'
import type { WikiNavigationLink } from '~/data/wikiNavigation'
import { wikiNavigation } from '~/data/wikiNavigation'
import type { WikiTocLink } from '~/types/wiki'
import { scrollTopToReveal } from '~/utils/articleNavigation'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const sidebar = useTemplateRef<HTMLElement>('sidebar')
const currentPath = computed(() => normalizeWikiPath(route.path))
const preferredMotion = usePreferredReducedMotion()
const { activeHeading } = useActiveArticleHeading()
const activeHeadingId = computed(() => (
  activeHeading.value.path === currentPath.value
    ? activeHeading.value.id
    : null
))

const { data: articles } = await useAsyncData(
  'wiki:sidebar-articles',
  () => queryCollection('wiki').all()
)

const headingsByPath = computed(() => new Map(
  (articles.value ?? []).map(article => [
    normalizeWikiPath(article.path),
    (article.body?.toc?.links as WikiTocLink[] | undefined) ?? []
  ])
))
const expandedPaths = ref<string[]>([])

watch(
  currentPath,
  () => {
    const activePaths = wikiNavigation.flatMap(section => section.links.flatMap((link) => {
      const paths: string[] = []
      if (isBranchActive(link)) paths.push(link.to)
      if (isCurrent(link.to) && headingsFor(link.to).length) paths.push(link.to)
      link.children?.forEach((child) => {
        if (isCurrent(child.to) && headingsFor(child.to).length) paths.push(child.to)
      })
      return paths
    }))
    expandedPaths.value = [...new Set([...expandedPaths.value, ...activePaths])]
  },
  { immediate: true }
)

watch(
  [
    activeHeadingId,
    () => props.open,
    currentPath
  ],
  async ([activeId]) => {
    if (!activeId) {
      return
    }

    await nextTick()
    revealActiveHeading()
  },
  { flush: 'post' }
)

function isCurrent(path: string): boolean {
  return currentPath.value === path
}

function isBranchActive(link: WikiNavigationLink): boolean {
  return isCurrent(link.to) || link.children?.some(child => isCurrent(child.to)) === true
}

function hasExpandableContent(link: WikiNavigationLink): boolean {
  return Boolean(link.children?.length || headingsFor(link.to).length)
}

function headingsFor(path: string): WikiTocLink[] {
  return headingsByPath.value.get(normalizeWikiPath(path)) ?? []
}

function isExpanded(path: string): boolean {
  return expandedPaths.value.includes(path)
}

function toggleExpanded(path: string): void {
  expandedPaths.value = isExpanded(path)
    ? expandedPaths.value.filter(entry => entry !== path)
    : [...expandedPaths.value, path]
}

function panelId(path: string): string {
  return `wiki-nav-${path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-')}`
}

function disclosureLabel(link: WikiNavigationLink): string {
  return `${isExpanded(link.to) ? 'Свернуть' : 'Развернуть'} «${link.label}»`
}

function revealActiveHeading(): void {
  const container = sidebar.value
  const target = container?.querySelector<HTMLElement>('[aria-current="location"]')
  if (!container || !target || target.getClientRects().length === 0) {
    return
  }

  const nextScrollTop = scrollTopToReveal(
    container.getBoundingClientRect(),
    target.getBoundingClientRect(),
    container.scrollTop,
    14
  )
  if (Math.abs(nextScrollTop - container.scrollTop) < 1) {
    return
  }

  container.scrollTo({
    top: nextScrollTop,
    behavior: preferredMotion.value === 'reduce' ? 'auto' : 'smooth'
  })
}
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

  > nav {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
}

.nav-section {
  display: flex;
  flex-direction: column;

  > p {
    margin: 0 0 7px;
    color: var(--muted);
    font-family: 'Tiny5', monospace;
    font-size: 17px;
  }

  > ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
}

.nav-entry {
  display: flex;
  flex-direction: column;
}

.nav-row {
  display: flex;
  align-items: center;
}

.nav-link {
  min-height: 36px;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  padding: 4px 10px;
  color: var(--ink);
  font-size: 14px;
  text-decoration: none;

  &:hover,
  &.branch {
    color: var(--accent);
    background: var(--surface-quiet);
  }

  &.router-link-exact-active {
    box-shadow: inset 3px 0 0 var(--accent);
    font-weight: 750;
  }
}

.disclosure {
  width: 36px;
  height: 36px;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--muted);
  background: transparent;
  border: 0;

  &:hover,
  &:focus-visible {
    color: var(--accent);
    background: var(--surface-quiet);
  }

  svg {
    transition: transform 140ms ease;
  }

  &.expanded svg {
    transform: rotate(90deg);
  }
}

.nav-children {
  margin: 2px 0 5px;
  padding: 0 0 0 13px;
  list-style: none;

  .nav-link {
    min-height: 32px;
    color: var(--muted);
    font-size: 12px;

    &:hover,
    &.branch {
      color: var(--accent);
    }
  }

  .disclosure {
    width: 32px;
    height: 32px;
  }
}

.sidebar-release {
  display: flex;
  gap: 10px;
  margin-top: 32px;
  padding: 14px;
  background: var(--surface-quiet);

  > svg {
    flex: none;
    margin-top: 2px;
    color: var(--accent);
  }

  strong,
  p,
  a {
    display: block;
    font-size: 12px;
  }

  p {
    margin: 3px 0 9px;
    color: var(--muted);
    line-height: 1.45;
  }

  a {
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    font-weight: 800;
  }

  .release-links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 13px;
  }
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
  .site-sidebar,
  .disclosure svg {
    transition: none;
  }
}
</style>
