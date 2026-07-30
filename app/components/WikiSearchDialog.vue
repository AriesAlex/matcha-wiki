<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="search-backdrop"
      role="presentation"
      @mousedown.self="close"
    >
      <section
        class="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Поиск по Matcha Wiki"
      >
        <div class="search-field">
          <PhMagnifyingGlass
            :size="22"
            weight="bold"
          />
          <input
            ref="input"
            v-model="query"
            type="search"
            placeholder="Предмет, рецепт, ID или достижение"
            autocomplete="off"
          >
          <button
            class="icon-button"
            type="button"
            title="Закрыть поиск"
            @click="close"
          >
            <PhX :size="20" />
          </button>
        </div>

        <p
          v-if="!query"
          class="search-hint"
        >
          Популярные предметы. Введите название или технический ID.
        </p>

        <nav
          v-if="results.length"
          class="search-results"
          aria-label="Результаты поиска"
        >
          <NuxtLink
            v-for="entry in results"
            :key="`${entry.kind}:${entry.path}:${entry.title}`"
            :to="entry.path"
            class="search-result"
          >
            <span class="search-result-icon">
              <img
                v-if="entry.icon"
                :src="useAssetPath(entry.icon)"
                alt=""
                width="32"
                height="32"
              >
            </span>
            <span>
              <small>{{ kindLabels[entry.kind] }}</small>
              <strong><MinecraftText :text="entry.title" /></strong>
              <span><MinecraftText :text="entry.description" /></span>
            </span>
            <PhArrowRight
              :size="18"
              aria-hidden="true"
            />
          </NuxtLink>
        </nav>

        <div
          v-else
          class="search-empty"
        >
          <img
            :src="useAssetPath('/generated/ui/pack.png')"
            alt=""
            width="72"
            height="72"
          >
          <p>Совпадений нет. Попробуйте русское имя, resource ID или название ингредиента.</p>
        </div>

        <footer class="search-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> просмотреть</span>
          <span><kbd>Esc</kbd> закрыть</span>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { PhArrowRight, PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import type { WikiSearchEntry } from '../composables/useWikiCatalog'

const { isOpen, close } = useSearchDialog()
const route = useRoute()
const query = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const index = useWikiSearchIndex()

const kindLabels: Record<WikiSearchEntry['kind'], string> = {
  item: 'Предмет',
  recipe: 'Рецепт',
  advancement: 'Достижение'
}

const results = computed(() => {
  const needle = normalizeSearch(query.value)
  if (!needle) {
    return index.filter(entry => entry.kind === 'item').slice(0, 8)
  }

  return index
    .map((entry) => {
      const title = normalizeSearch(entry.title)
      const terms = normalizeSearch(entry.terms)
      const score = title === needle ? 0 : title.startsWith(needle) ? 1 : terms.includes(needle) ? 2 : 9
      return { entry, score }
    })
    .filter(result => result.score < 9)
    .sort((left, right) => left.score - right.score || left.entry.title.localeCompare(right.entry.title, 'ru'))
    .slice(0, 24)
    .map(result => result.entry)
})

watch(isOpen, async (open) => {
  if (import.meta.client) {
    document.body.classList.toggle('dialog-open', open)
  }
  if (open) {
    await nextTick()
    input.value?.focus()
  }
})

watch(() => route.fullPath, close)

onMounted(() => {
  window.addEventListener('keydown', handleShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  document.body.classList.remove('dialog-open')
})

function handleShortcut(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null
  const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isOpen.value = true
  } else if (event.key === '/' && !isTyping) {
    event.preventDefault()
    isOpen.value = true
  } else if (event.key === 'Escape' && isOpen.value) {
    close()
  }
}

function normalizeSearch(value: string): string {
  return stripMinecraftFormatting(value).toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim()
}
</script>

<style scoped lang="scss">
.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  justify-content: center;
  padding: 9vh 20px 20px;
  background: rgba(7, 13, 9, 0.72);

  .search-dialog {
    width: min(720px, 100%);
    height: fit-content;
    max-height: min(760px, 82dvh);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--ink);
    background: var(--surface);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }

  .search-field {
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px 0 20px;
    background: var(--surface-quiet);

    input {
      min-width: 0;
      flex: 1;
      padding: 16px 0;
      background: transparent;
      border: 0;
      outline: 0;
      font-size: 18px;
    }
  }

  .icon-button {
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    background: transparent;
    border: 0;

    &:hover {
      color: var(--accent);
      background: var(--surface-deep);
    }
  }

  .search-hint {
    margin: 0;
    padding: 14px 20px 4px;
    color: var(--muted);
    font-size: 13px;
  }

  .search-results {
    overflow: auto;
    padding: 10px 20px 18px;
  }

  .search-result {
    min-height: 68px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 20px;
    align-items: center;
    gap: 12px;
    padding: 10px 4px;
    color: inherit;
    text-decoration: none;

    + .search-result {
      border-top: 1px solid var(--edge);
    }

    &:hover,
    &:focus-visible {
      color: inherit;
      background: var(--surface-quiet);
    }

    > span:nth-child(2) {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    small {
      color: var(--accent);
      font-family: 'Tiny5', monospace;
      font-size: 15px;
    }

    strong,
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: var(--muted);
      font-size: 13px;
    }
  }

  .search-result-icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-deep);

    img {
      width: 32px;
      height: 32px;
      object-fit: contain;
      image-rendering: pixelated;
    }
  }

  .search-empty {
    min-height: 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 30px;
    text-align: center;

    img {
      image-rendering: pixelated;
    }

    p {
      max-width: 440px;
      color: var(--muted);
    }
  }

  .search-footer {
    display: flex;
    justify-content: flex-end;
    gap: 20px;
    padding: 10px 20px;
    color: var(--muted);
    background: var(--surface-quiet);
    font-size: 12px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    kbd {
      min-width: 22px;
      padding: 2px 5px;
      color: var(--ink);
      background: var(--surface);
      text-align: center;
    }
  }

  @media (max-width: 620px) {
    padding: 0;
    align-items: flex-end;

    .search-dialog {
      width: 100%;
      height: 100dvh;
      max-height: none;
    }

    .search-field {
      padding-top: env(safe-area-inset-top);
    }

    .search-results {
      padding-inline: 14px;
    }

    .search-footer {
      display: none;
    }
  }
}
</style>
