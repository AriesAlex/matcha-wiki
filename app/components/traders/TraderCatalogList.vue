<template>
  <ul class="traders">
    <li
      v-for="trader in traders"
      :key="trader.id"
    >
      <NuxtLink :to="`/traders/${trader.slug}`">
        <ItemSlotSurface
          v-if="trader.jobSite"
          :icon-url="trader.jobSite.stack.icon ? useAssetPath(trader.jobSite.stack.icon) : ''"
          :display-name="trader.jobSite.title"
        />
        <span
          v-else
          class="wanderer"
          aria-hidden="true"
        >
          <PhPersonSimpleWalk :size="28" />
        </span>

        <span class="copy">
          <span class="title">
            <strong>{{ trader.title }}</strong>
            <small v-if="trader.vanillaTitle">
              В обычной игре: {{ trader.vanillaTitle }}
            </small>
          </span>
          <span class="summary">{{ trader.summary }}</span>
          <span class="count">
            {{ trader.offerCount }}
            {{ russianWordForm(trader.offerCount, ['полезная сделка', 'полезные сделки', 'полезных сделок']) }}
          </span>
        </span>

        <PhArrowRight
          class="arrow"
          :size="22"
          aria-hidden="true"
        />
      </NuxtLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhPersonSimpleWalk
} from '@phosphor-icons/vue'
import type { TraderView } from '../../types/entities'
import { russianWordForm } from '../../utils/russianGrammar'

defineProps<{
  traders: TraderView[]
}>()
</script>

<style scoped lang="scss">
.traders {
  max-width: 940px;
  margin: 0;
  padding: 0;
  list-style: none;

  li + li {
    border-top: 1px solid var(--edge);
  }

  a {
    min-height: 116px;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    padding: 18px 8px;
    color: inherit;
    text-decoration: none;

    &:hover,
    &:focus-visible {
      background: var(--surface-quiet);

      strong,
      .arrow {
        color: var(--accent);
      }

      .arrow {
        transform: translateX(4px);
      }
    }
  }

  .wanderer {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    color: var(--accent);
    background: var(--surface-quiet);
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 10px;

    strong {
      font-size: 18px;
    }

    small {
      color: var(--muted);
      font-size: 12px;
    }
  }

  .summary {
    max-width: 720px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.45;
  }

  .count {
    color: var(--accent);
    font-family: 'Tiny5', monospace;
    font-size: 16px;
  }

  .arrow {
    color: var(--muted);
  }

  @media (max-width: 580px) {
    a {
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 12px;
      padding-inline: 0;
    }

    .arrow {
      display: none;
    }
  }
}

@media (prefers-reduced-motion: no-preference) {
  .traders {
    strong,
    .arrow {
      transition:
        color 120ms ease,
        transform 120ms ease;
    }
  }
}
</style>
