<template>
  <section class="sidebar-release" aria-labelledby="fork-release-title">
    <div class="release-heading">
      <PhTranslate :size="22" weight="bold" aria-hidden="true" />
      <div>
        <span>Готовая версия</span>
        <strong id="fork-release-title">Русская Matcha</strong>
      </div>
    </div>

    <p>Ручной перевод и исправления. Один ZIP для игры.</p>

    <div class="release-actions">
      <a
        class="download-link"
        :href="downloadUrl"
      >
        <PhDownloadSimple :size="17" weight="bold" aria-hidden="true" />
        Скачать
      </a>
      <NuxtLink to="/fork">
        Что переведено
        <PhArrowRight :size="15" weight="bold" aria-hidden="true" />
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhDownloadSimple,
  PhTranslate
} from '@phosphor-icons/vue'
import { releaseDownloadUrl } from '~/utils/siteMeta'

const catalog = useWikiCatalog()
const downloadUrl = releaseDownloadUrl(
  catalog.pack.artifactName,
  catalog.pack.version
)
</script>

<style scoped lang="scss">
.sidebar-release {
  margin: 0 0 24px;
  padding: 13px 13px 12px;
  border: 1px solid var(--edge);
  background: var(--surface-quiet);
  box-shadow: inset 3px 0 var(--accent);

  .release-heading {
    display: flex;
    gap: 9px;
    align-items: center;

    > svg {
      flex: none;
      color: var(--accent);
    }

    div {
      min-width: 0;
    }

    span,
    strong {
      display: block;
    }

    span {
      color: var(--accent);
      font-family: 'Tiny5', monospace;
      font-size: 13px;
      line-height: 1;
    }

    strong {
      margin-top: 3px;
      font-size: 13px;
      line-height: 1.2;
    }
  }

  > p {
    margin: 9px 0 10px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .release-actions {
    display: grid;
    gap: 4px;
    align-items: stretch;
  }

  a {
    min-height: 36px;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    padding: 0 9px;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;

    &:focus-visible {
      outline: 2px solid var(--ink);
      outline-offset: 2px;
    }
  }

  .download-link {
    color: var(--surface);
    background: var(--accent);

    &:hover {
      color: var(--surface);
      background: color-mix(in srgb, var(--accent) 82%, var(--ink));
    }
  }

  .download-link + a {
    min-height: 30px;
    justify-content: flex-start;
    padding: 0 2px;
  }
}
</style>
