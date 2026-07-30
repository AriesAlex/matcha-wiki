<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="search-backdrop"
      role="presentation"
      @mousedown.self="close"
    >
      <section
        ref="dialog"
        class="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Поиск по Matcha Wiki"
        tabindex="-1"
      >
        <div class="search-field">
          <PhMagnifyingGlass
            :size="22"
            weight="bold"
            aria-hidden="true"
          />
          <input
            ref="input"
            v-model="query"
            name="wiki-search"
            type="search"
            placeholder="Предмет, достижение или способ получения…"
            autocomplete="off"
            spellcheck="false"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="wiki-search-results"
            :aria-expanded="results.length > 0"
            :aria-activedescendant="activeResultId"
          >
          <button
            class="icon-button"
            type="button"
            title="Закрыть поиск"
            @click="close"
          >
            <PhX :size="20" aria-hidden="true" />
          </button>
        </div>

        <p
          v-if="!query"
          class="search-hint"
        >
          Начните вводить игровое название или ингредиент.
        </p>

        <div
          v-if="results.length"
          id="wiki-search-results"
          ref="resultsList"
          class="search-results"
          aria-label="Результаты поиска"
          role="listbox"
        >
          <WikiSearchResult
            v-for="(entry, resultIndex) in results"
            :id="resultId(resultIndex)"
            :key="`${entry.kind}:${entry.path}:${entry.title}`"
            :entry="entry"
            :active="activeIndex === resultIndex"
            :data-result-index="resultIndex"
            @mouseenter="setActiveIndex(resultIndex)"
            @focus="setActiveIndex(resultIndex)"
          />
        </div>

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
          <p>Ничего не нашли. Попробуйте другое русское название или ингредиент.</p>
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
import { PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import type { WikiSearchEntry } from '../types/wiki'

const { isOpen, close } = useSearchDialog()
const route = useRoute()
const query = ref('')
const dialog = useTemplateRef<HTMLElement>('dialog')
const input = useTemplateRef<HTMLInputElement>('input')
const resultsList = useTemplateRef<HTMLElement>('resultsList')
const index = useWikiSearchIndex()

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
const { activeIndex, setActiveIndex } = useSearchKeyboardNavigation(
  isOpen,
  results,
  input,
  openResult
)
const activeResultId = computed(() => (
  activeIndex.value >= 0 ? resultId(activeIndex.value) : undefined
))

useModalFocusTrap(dialog, isOpen, input)

watch(activeIndex, async (index) => {
  if (index < 0) return
  await nextTick()
  resultsList.value
    ?.querySelector<HTMLElement>(`[data-result-index="${index}"]`)
    ?.scrollIntoView({ block: 'nearest' })
})

watch(isOpen, (open) => {
  if (import.meta.client) {
    document.body.classList.toggle('dialog-open', open)
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

function openResult(entry: WikiSearchEntry): void {
  close()
  void navigateTo(entry.path)
}

function resultId(index: number): string {
  return `wiki-search-result-${index}`
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
  overscroll-behavior: contain;

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

    &:focus-within {
      box-shadow: inset 0 -3px 0 var(--accent);
    }

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
