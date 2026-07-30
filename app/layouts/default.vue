<template>
  <div class="app-frame">
    <a class="skip-link" href="#main-content">К содержанию</a>

    <header class="site-header">
      <div class="header-inner">
        <button
          class="icon-button mobile-only"
          type="button"
          :title="navigationOpen ? 'Закрыть меню' : 'Открыть меню'"
          :aria-expanded="navigationOpen"
          aria-controls="site-sidebar"
          @click="navigationOpen = !navigationOpen"
        >
          <PhX v-if="navigationOpen" :size="22" />
          <PhList v-else :size="22" />
        </button>

        <NuxtLink class="brand" to="/">
          <img
            :src="useAssetPath('/generated/ui/pack.png')"
            alt=""
            width="40"
            height="40"
          >
          <span>
            <strong>Matcha Wiki</strong>
            <small>редакция {{ catalog.pack.version }} · {{ catalog.pack.minecraft }}</small>
          </span>
        </NuxtLink>

        <nav class="header-nav" aria-label="Основная навигация">
          <NuxtLink to="/start">
            <PhBookOpenText :size="18" />
            Начать
          </NuxtLink>
          <NuxtLink to="/progression">
            <PhCompass :size="18" />
            Путь игры
          </NuxtLink>
          <NuxtLink to="/items">
            <PhSquaresFour :size="18" />
            Предметы
          </NuxtLink>
        </nav>

        <div class="header-actions">
          <button
            class="search-button"
            type="button"
            aria-label="Открыть поиск"
            @click="openSearch"
          >
            <PhMagnifyingGlass :size="19" weight="bold" />
            <span>Поиск</span>
            <kbd>Ctrl K</kbd>
          </button>
          <ThemeButton />
        </div>
      </div>
    </header>

    <button
      v-if="navigationOpen"
      class="navigation-backdrop"
      type="button"
      aria-label="Закрыть меню"
      tabindex="-1"
      @click="navigationOpen = false"
    />

    <div class="site-grid">
      <WikiSidebar
        :open="navigationOpen"
        @close="navigationOpen = false"
      />

      <main id="main-content" class="main-content">
        <slot />
      </main>
    </div>

    <footer class="site-footer">
      <div
        class="panorama-strip"
        :style="{ backgroundImage: `url(${useAssetPath('/generated/ui/panorama.png')})` }"
      />
      <div class="footer-inner">
        <p>
          Неофициальная русская энциклопедия Matcha Flavoured. Игровые данные
          проверяются по исходникам пака.
        </p>
        <a href="https://github.com/AriesAlex/matcha-wiki">
          <PhGithubLogo :size="20" />
          Исходники и исправления
        </a>
        <NuxtLink to="/known-issues">
          <PhBugBeetle :size="20" />
          Известные проблемы
        </NuxtLink>
      </div>
    </footer>

    <WikiSearchDialog />
  </div>
</template>

<script setup lang="ts">
import {
  PhBookOpenText,
  PhBugBeetle,
  PhCompass,
  PhGithubLogo,
  PhList,
  PhMagnifyingGlass,
  PhSquaresFour,
  PhX
} from '@phosphor-icons/vue'

const route = useRoute()
const catalog = useWikiCatalog()
const { open: openSearch } = useSearchDialog()
const navigationOpen = ref(false)

watch(() => route.fullPath, () => {
  navigationOpen.value = false
})

watch(navigationOpen, (open) => {
  if (import.meta.client) {
    document.body.classList.toggle('navigation-open', open)
  }
})

onBeforeUnmount(() => {
  document.body.classList.remove('navigation-open')
})
</script>

<style scoped lang="scss">
.app-frame {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;

  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    color: var(--ink);
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    border-bottom: 1px solid var(--edge);
  }

  .header-inner {
    width: min(1480px, 100%);
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 28px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .brand {
    display: flex;
    flex: none;
    align-items: center;
    gap: 10px;
    color: inherit;
    text-decoration: none;

    img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      image-rendering: pixelated;
    }

    span {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    strong {
      font-family: 'Tiny5', monospace;
      font-size: 24px;
      letter-spacing: 0.02em;
    }

    small {
      color: var(--muted);
      font-size: 11px;
    }
  }

  .header-nav {
    display: flex;
    align-self: stretch;
    align-items: center;
    gap: 4px;

    a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 0 12px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;

      &:hover,
      &.router-link-active {
        color: var(--accent);
        background: var(--surface-quiet);
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .search-button {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 10px 0 14px;
    color: var(--ink);
    background: var(--surface-quiet);
    border: 0;

    &:hover {
      color: var(--accent);
      background: var(--surface-deep);
    }

    kbd {
      padding: 2px 6px;
      color: var(--muted);
      background: var(--surface);
      font-size: 11px;
    }
  }

  .icon-button {
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--ink);
    background: transparent;
    border: 0;
  }

  .mobile-only {
    display: none;
  }

  .navigation-backdrop {
    display: none;
  }

  .site-grid {
    width: min(1480px, 100%);
    display: grid;
    grid-template-columns: 238px minmax(0, 1fr);
    gap: 56px;
    flex: 1;
    margin: 0 auto;
    padding: 34px 24px 96px;
  }

  .main-content {
    width: min(100%, 1040px);
    min-width: 0;
    padding-top: 22px;
  }

  .site-footer {
    margin-top: auto;
    color: #edf5e9;
    background: #142018;

    .panorama-strip {
      height: 104px;
      background-position: center 58%;
      background-size: cover;
      filter: saturate(0.75) brightness(0.62);
    }

    .footer-inner {
      width: min(1480px, 100%);
      display: flex;
      align-items: center;
      gap: 28px;
      margin: 0 auto;
      padding: 28px 24px;
    }

    p {
      max-width: 660px;
      margin: 0 auto 0 0;
      color: #b9c8bb;
      font-size: 13px;
    }

    a {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: #edf5e9;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;

      &:hover {
        color: var(--accent-bright);
      }
    }
  }

  @media (max-width: 1050px) {
    .navigation-backdrop {
      position: fixed;
      inset: 64px 0 0;
      z-index: 30;
      display: block;
      padding: 0;
      background: rgba(7, 13, 9, 0.58);
      border: 0;
    }

    .header-nav {
      display: none;
    }

    .mobile-only {
      display: inline-flex;
    }

    .header-inner {
      gap: 12px;
    }

    .site-grid {
      display: block;
      padding-top: 28px;
    }

    .main-content {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
    }
  }

  @media (max-width: 660px) {
    .header-inner {
      padding-inline: 10px;
    }

    .brand {
      strong {
        font-size: 21px;
      }

      small {
        display: none;
      }
    }

    .search-button {
      width: 44px;
      justify-content: center;
      padding: 0;

      span,
      kbd {
        display: none;
      }
    }

    .site-grid {
      padding: 28px 16px 72px;
    }

    .site-footer {
      .panorama-strip {
        height: 78px;
      }

      .footer-inner {
        align-items: flex-start;
        flex-direction: column;
        gap: 14px;
        padding: 24px 16px;
      }
    }
  }
}
</style>
