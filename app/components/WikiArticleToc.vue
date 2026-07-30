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
        :to="{ path, hash: `#${heading.id}` }"
      >
        {{ heading.text }}
      </NuxtLink>
      <ul v-if="heading.children?.length" class="nested">
        <li v-for="child in heading.children" :key="child.id">
          <NuxtLink
            class="article-anchor"
            :class="{ current: isCurrent(child.id) }"
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
}>()

const route = useRoute()

function isCurrent(id: string): boolean {
  return normalizeWikiPath(route.path) === normalizeWikiPath(props.path)
    && route.hash === `#${id}`
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
  font-size: 11px;
  line-height: 1.3;
  text-decoration: none;

  &:hover,
  &.current {
    color: var(--accent);
  }
}
</style>
