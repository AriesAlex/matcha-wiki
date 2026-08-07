<template>
  <section
    class="fork-download"
    aria-label="Скачать русскую версию Matcha Flavoured"
  >
    <img
      :src="useAssetPath('/generated/ui/pack.png')"
      alt=""
      width="112"
      height="112"
    >
    <div>
      <p class="version">Для Minecraft Java {{ catalog.pack.minecraft }}</p>
      <a :href="downloadUrl">
        <PhDownloadSimple :size="30" weight="bold" aria-hidden="true" />
        Скачать русскую Matcha
      </a>
      <p class="download-hint">
        Скачивание начнётся сразу. ZIP уже содержит механики, русский текст
        и ресурсы, распаковывать его не нужно.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PhDownloadSimple } from '@phosphor-icons/vue'
import { releaseDownloadUrl } from '~/utils/siteMeta'

const catalog = useWikiCatalog()
const downloadUrl = releaseDownloadUrl(
  catalog.pack.artifactName,
  catalog.pack.version
)
</script>

<style scoped lang="scss">
.fork-download {
  max-width: 760px;
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
  margin: 0 0 56px;
  padding: 24px;
  background: var(--surface-quiet);
  border: 1px solid var(--edge);
  box-shadow: inset 5px 0 var(--accent);

  img {
    width: 112px;
    height: 112px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .version {
    margin: 0 0 10px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 700;
  }

  a {
    width: 100%;
    min-height: 72px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 14px 22px;
    color: var(--surface);
    background: var(--accent);
    font-size: clamp(1.15rem, 2.4vw, 1.45rem);
    font-weight: 850;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    box-shadow: 0 5px 0 color-mix(in srgb, var(--accent) 68%, var(--ink));
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease,
      transform 120ms ease;

    &:hover {
      color: var(--surface);
      background: color-mix(in srgb, var(--accent) 84%, var(--ink));
    }

    &:active {
      box-shadow: 0 2px 0 color-mix(in srgb, var(--accent) 68%, var(--ink));
      transform: translateY(3px);
    }
  }

  .download-hint {
    margin: 14px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }
}

@media (max-width: 560px) {
  .fork-download {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    padding: 18px;

    img {
      width: 76px;
      height: 76px;
    }

    a {
      min-height: 64px;
      padding-inline: 16px;
    }
  }
}
</style>
