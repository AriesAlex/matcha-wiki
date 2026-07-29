<template>
  <aside
    id="site-sidebar"
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
            <NuxtLink
              class="nav-link"
              :class="{ branch: isBranchActive(link) }"
              :to="link.to"
            >
              {{ link.label }}
            </NuxtLink>

            <WikiArticleToc
              v-if="isCurrent(link.to)"
              :links="articleHeadings"
            />

            <ul v-if="link.children?.length" class="nav-children">
              <li v-for="child in link.children" :key="child.to">
                <NuxtLink
                  class="nav-link"
                  :class="{ branch: isBranchActive(child) }"
                  :to="child.to"
                >
                  {{ child.label }}
                </NuxtLink>
                <WikiArticleToc
                  v-if="isCurrent(child.to)"
                  :links="articleHeadings"
                />
              </li>
            </ul>
          </li>
        </ul>
      </section>
    </nav>

    <div class="sidebar-release">
      <PhTranslate :size="20" />
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
import { PhTranslate } from '@phosphor-icons/vue'
import type { WikiNavigationLink } from '~/data/wikiNavigation'
import { wikiNavigation } from '~/data/wikiNavigation'
import type { WikiTocLink } from '~/types/wiki'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const currentPath = computed(() => normalizeWikiPath(route.path))

const { data: currentArticle } = await useAsyncData(
  () => `wiki:sidebar-article:${currentPath.value}`,
  () => queryCollection('wiki')
    .path(currentPath.value)
    .first()
)

const articleHeadings = computed<WikiTocLink[]>(
  () => (currentArticle.value?.body?.toc?.links as WikiTocLink[] | undefined) ?? []
)

function isCurrent(path: string): boolean {
  return currentPath.value === path
}

function isBranchActive(link: WikiNavigationLink): boolean {
  return isCurrent(link.to) || link.children?.some(child => isCurrent(child.to)) === true
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

.nav-link {
  min-height: 36px;
  display: flex;
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
    inset: 64px auto 0 0;
    z-index: 35;
    width: min(360px, 92vw);
    max-height: none;
    overflow-y: auto;
    padding: 28px 24px 48px;
    background: var(--surface);
    box-shadow: 24px 0 60px var(--shadow);
    transform: translateX(-110%);
    transition: transform 180ms ease;
    visibility: hidden;
    pointer-events: none;

    &.open {
      transform: translateX(0);
      visibility: visible;
      pointer-events: auto;
    }
  }
}
</style>
