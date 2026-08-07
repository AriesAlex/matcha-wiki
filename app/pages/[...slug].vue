<template>
  <article
    v-if="page"
    ref="article"
    class="content-page"
  >
    <header class="page-heading">
      <p class="eyebrow">{{ page.category }}</p>
      <h1>{{ page.title }}</h1>
      <p v-if="page.description">{{ page.description }}</p>
    </header>
    <ContentRenderer :value="page" />
    <nav
      v-if="relatedPages.length"
      class="related-articles"
      aria-labelledby="related-heading"
    >
      <h2 id="related-heading">Читайте дальше</h2>
      <ul role="list">
        <li
          v-for="relatedPage in relatedPages"
          :key="relatedPage.path"
        >
          <NuxtLink :to="relatedPage.path">
            <strong>{{ relatedPage.title }}</strong>
            <span v-if="relatedPage.description">{{ relatedPage.description }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
    <footer
      v-if="page.sourcePaths?.length"
      class="article-sources"
    >
      <details>
        <summary>Для проверки данных</summary>
        <p>Статья сверена со следующими файлами игрового пака:</p>
        <ul role="list">
          <li
            v-for="source in page.sourcePaths"
            :key="source"
          >
            <code>{{ source }}</code>
          </li>
        </ul>
      </details>
    </footer>
  </article>
  <WikiErrorState v-else :status-code="404" />
</template>

<script setup lang="ts">
import type { WikiTocLink } from '~/types/wiki'

const route = useRoute()
const article = useTemplateRef<HTMLElement>('article')
const pagePath = computed(() => normalizeWikiPath(route.path))
const {
  data: page,
  error: pageError,
  status: pageStatus
} = await useAsyncData(
  () => `wiki:${pagePath.value}`,
  () => queryCollection('wiki').path(pagePath.value).first()
)
const missingPage = computed(
  () => isMissingWikiPage(pageStatus.value, page.value)
)
const tocLinks = computed(
  () => (page.value?.body?.toc?.links as WikiTocLink[] | undefined) ?? []
)

useArticleScrollspy(article, tocLinks, pagePath)

if (import.meta.server && pageError.value) {
  throw pageError.value
}

const requestEvent = useRequestEvent()

if (import.meta.server && missingPage.value && requestEvent) {
  setResponseStatus(requestEvent, 404)
}

onMounted(() => {
  if (pageError.value) {
    showError(pageError.value)
  }
})

const { data: pageIndex } = await useAsyncData(
  'wiki:page-index',
  () => queryCollection('wiki')
    .select('path', 'title', 'description')
    .all()
)

const relatedPages = computed(() => {
  const pagesByPath = new Map(
    (pageIndex.value ?? []).map(relatedPage => [relatedPage.path, relatedPage])
  )
  return page.value?.related?.flatMap(path => pagesByPath.get(path) ?? []) ?? []
})

useWikiSeo({
  title: () => page.value?.title ?? 'Страница не найдена',
  description: () => page.value?.description ?? 'Запрошенной страницы нет в Matcha Wiki.',
  indexable: () => !missingPage.value
})
</script>

<style scoped lang="scss">
.content-page {
  max-width: 900px;

  :deep(h2) {
    margin-top: 64px;
    margin-bottom: 20px;
    scroll-margin-top: 88px;
  }

  :deep(h3) {
    margin-top: 40px;
    margin-bottom: 14px;
    font-size: 1.35rem;
    scroll-margin-top: 88px;
  }

  :deep(h4) {
    scroll-margin-top: 88px;
  }

  :deep(p),
  :deep(li) {
    max-width: 760px;
  }

  :deep(p) {
    margin: 15px 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 18px 0;
    padding-left: 26px;
  }

  :deep(li + li) {
    margin-top: 7px;
  }

  :deep(blockquote) {
    max-width: 760px;
    margin: 26px 0;
    padding: 16px 20px;
    color: var(--muted);
    background: var(--surface-quiet);

    p {
      margin: 0;
    }
  }

  :deep(table) {
    width: 100%;
    margin: 26px 0;
    border-collapse: collapse;
    font-size: 14px;

    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--edge);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }
  }

  .related-articles {
    max-width: 760px;
    margin-top: 72px;

    h2 {
      margin-bottom: 16px;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li + li {
      border-top: 1px solid var(--edge);
    }

    a {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 15px 0;
      color: var(--ink);
      text-decoration: none;

      &:hover strong {
        color: var(--accent);
      }
    }

    strong {
      font-size: 1.05rem;
    }

    span {
      color: var(--muted);
      font-size: 14px;
    }
  }

  .article-sources {
    margin-top: 72px;

    summary {
      width: fit-content;
      min-height: 44px;
      display: flex;
      align-items: center;
      color: var(--muted);
      font-weight: 700;
      cursor: pointer;
    }

    p {
      margin: 8px 0 10px;
      color: var(--muted);
      font-size: 13px;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0;
      padding: 16px 20px;
      background: var(--surface-quiet);
      list-style: none;
    }

    code {
      color: var(--muted);
      font-size: 12px;
    }
  }

  @media (max-width: 680px) {
    overflow-wrap: anywhere;

    :deep(table) {
      display: block;
      overflow-x: auto;
    }
  }
}
</style>
