<template>
  <article v-if="page" class="content-page">
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
      <h2>Источники в паке</h2>
      <ul role="list">
        <li
          v-for="source in page.sourcePaths"
          :key="source"
        >
          <code>{{ source }}</code>
        </li>
      </ul>
    </footer>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const pagePath = computed(() => normalizeWikiPath(route.path))
const {
  data: page,
  error: pageError,
  status: pageStatus
} = await useAsyncData(
  () => `wiki:${pagePath.value}`,
  () => queryCollection('wiki').path(pagePath.value).first()
)

if (import.meta.server && pageError.value) {
  throw pageError.value
}

if (import.meta.server && isMissingWikiPage(pageStatus.value, page.value)) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Статья не найдена'
  })
}

onMounted(() => {
  if (pageError.value) {
    showError(pageError.value)
  } else if (isMissingWikiPage(pageStatus.value, page.value)) {
    showError({
      statusCode: 404,
      statusMessage: 'Статья не найдена'
    })
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

useSeoMeta({
  title: () => page.value?.title ?? 'Matcha Wiki',
  description: () => page.value?.description ?? ''
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
    padding: 22px;
    background: var(--surface-quiet);

    h2 {
      margin: 0 0 10px;
      font-size: 1.25rem;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0;
      padding: 0;
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
