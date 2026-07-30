<template>
  <div class="item-overview">
    <header class="heading">
      <span class="icon">
        <img
          v-if="item.icon"
          :src="useAssetPath(item.icon)"
          :alt="stripMinecraftFormatting(item.title)"
          width="80"
          height="80"
        >
      </span>
      <div class="title">
        <p class="eyebrow">{{ item.category }}</p>
        <h1><MinecraftText :text="item.title" /></h1>
      </div>
    </header>

    <div class="introduction">
      <section class="summary">
        <p class="eyebrow">Коротко</p>
        <p class="lead">{{ summary }}</p>
        <p
          v-if="item.guide?.note"
          class="note"
        >
          {{ item.guide.note }}
        </p>
      </section>

      <aside
        class="game-preview"
        aria-label="Подсказка предмета в Minecraft"
      >
        <small>Так предмет подписан в игре</small>
        <div class="tooltip">
          <strong><MinecraftText :text="item.name" /></strong>
          <p
            v-for="line in item.lore"
            :key="line"
          >
            <MinecraftText :text="line" />
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ItemView } from '../types/wiki'

defineProps<{
  item: ItemView
  summary: string
}>()
</script>

<style scoped lang="scss">
.item-overview {
  .heading {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    align-items: center;
    gap: 28px;

    h1 {
      font-size: clamp(2.2rem, 5vw, 4.2rem);
    }
  }

  .icon {
    width: 112px;
    height: 112px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-quiet);

    img {
      width: 80px;
      height: 80px;
      object-fit: contain;
      image-rendering: pixelated;
    }
  }

  .introduction {
    max-width: 980px;
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
    align-items: start;
    gap: 42px;
    margin-top: 46px;
  }

  .summary {
    .lead {
      max-width: 680px;
      margin: 0;
      font-size: 19px;
      line-height: 1.65;
    }

    .note {
      max-width: 680px;
      margin: 20px 0 0;
      padding: 14px 16px;
      color: var(--muted);
      background: var(--surface-quiet);
      border-left: 3px solid var(--accent);
      line-height: 1.55;
    }
  }

  .game-preview {
    small {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 12px;
    }
  }

  .tooltip {
    min-height: 88px;
    padding: 14px 16px;
    color: #f8f8f8;
    background: #100010;
    border: 2px solid #2a0a55;
    box-shadow: inset 0 0 0 2px #10002d;
    font-family: 'Cascadia Mono', monospace;
    text-shadow: 2px 2px 0 #2d2d2d;

    strong {
      color: #fff;
    }

    p {
      margin: 4px 0 0;
      color: #bfbfbf;
      font-size: 13px;
    }
  }
}

@media (max-width: 760px) {
  .item-overview {
    .heading {
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 18px;
    }

    .icon {
      width: 82px;
      height: 82px;

      img {
        width: 62px;
        height: 62px;
      }
    }

    .introduction {
      display: flex;
      flex-direction: column;
      gap: 28px;

      > * {
        width: 100%;
      }
    }
  }
}
</style>
