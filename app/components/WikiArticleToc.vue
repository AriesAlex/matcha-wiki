<template>
  <ul
    v-if="links.length"
    class="article-toc"
    aria-label="Оглавление статьи"
  >
    <li v-for="heading in links" :key="heading.id">
      <NuxtLink
        class="article-anchor"
        :class="{ current: isCurrent(heading.id) }"
        :aria-current="isCurrent(heading.id) ? 'location' : undefined"
        :to="{ path, hash: `#${heading.id}` }"
      >
        {{ heading.text }}
      </NuxtLink>
      <ul v-if="heading.children?.length" class="nested">
        <li v-for="child in heading.children" :key="child.id">
          <NuxtLink
            class="article-anchor"
            :class="{ current: isCurrent(child.id) }"
            :aria-current="isCurrent(child.id) ? 'location' : undefined"
            :to="{ path, hash: `#${child.id}` }"
          >
            {{ child.text }}
          </NuxtLink>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { WikiTocLink } from '~/types/wiki'

const props = defineProps<{
  links: WikiTocLink[]
  path: string
  activeId: string | null
}>()

const route = useRoute()

function isCurrent(id: string): boolean {
  return normalizeWikiPath(route.path) === normalizeWikiPath(props.path)
    && props.activeId === id
}
</script>

<style scoped lang="scss">
.article-toc,
.nested {
  margin: 2px 0 5px;
  padding: 0 0 0 13px;
  list-style: none;
}

.article-toc {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nested {
  margin: 0;
  padding-left: 11px;
}

.article-anchor {
  min-height: 29px;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  color: var(--muted);
  background: transparent;
  box-shadow: inset 2px 0 0 transparent;
  font-size: 11px;
  line-height: 1.3;
  text-decoration: none;
  transition:
    color 120ms ease,
    background-color 120ms ease,
    box-shadow 120ms ease;

  &:hover {
    color: var(--accent);
  }

  &.current {
    color: var(--accent);
    background: var(--surface-quiet);
    box-shadow: inset 2px 0 0 var(--accent);
    font-weight: 700;
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-anchor {
    transition: none;
  }
}
</style>
