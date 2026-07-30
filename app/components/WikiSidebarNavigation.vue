<template>
  <nav class="sidebar-navigation" aria-label="Разделы вики">
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
          <WikiSidebarNavRow
            :branch-active="isBranchActive(link)"
            :expandable="hasExpandableContent(link)"
            :expanded="isExpanded(link.to)"
            :link="link"
            :panel-id="panelId(link.to)"
            @toggle="toggleExpanded(link.to)"
          />

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
                <WikiSidebarNavRow
                  nested
                  :branch-active="isBranchActive(child)"
                  :expandable="hasExpandableContent(child)"
                  :expanded="isExpanded(child.to)"
                  :link="child"
                  :panel-id="panelId(child.to)"
                  @toggle="toggleExpanded(child.to)"
                />
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
</template>

<script setup lang="ts">
import type { WikiNavigationLink } from '~/data/wikiNavigation'
import { wikiNavigation } from '~/data/wikiNavigation'
import type { WikiTocLink } from '~/types/wiki'

defineProps<{
  activeHeadingId: string | null
}>()

const route = useRoute()
const currentPath = computed(() => normalizeWikiPath(route.path))

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
</script>

<style scoped lang="scss">
.sidebar-navigation {
  display: flex;
  flex-direction: column;
  gap: 24px;
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

.nav-children {
  margin: 2px 0 5px;
  padding: 0 0 0 13px;
  list-style: none;
}
</style>
