<template>
  <ul class="relations">
    <li
      v-for="relation in relations"
      :key="`${relation.kind}:${relation.sourcePath}:${relation.title}`"
    >
      <ItemTradeRelation
        v-if="hasTradeExchange(relation)"
        :relation="relation"
      />
      <ItemRecipeRelation
        v-else-if="relation.kind === 'recipe' && relation.result"
        :relation="{ ...relation, result: relation.result }"
      />
      <component
        :is="relation.to ? NuxtLink : 'div'"
        v-else
        class="relation"
        :class="{ linked: relation.to }"
        :to="relation.to"
      >
        <span class="visual" aria-hidden="true">
          <img
            v-if="relation.icon"
            :src="useAssetPath(relation.icon)"
            alt=""
            width="32"
            height="32"
          >
          <component
            :is="relationIcons[relation.kind]"
            v-else
            :size="25"
          />
        </span>
        <span class="copy">
          <strong><MinecraftText :text="relation.title" /></strong>
          <small>{{ relation.description }}</small>
        </span>
        <PhArrowRight
          v-if="relation.to"
          class="arrow"
          :size="20"
          aria-hidden="true"
        />
      </component>
    </li>
  </ul>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhArrowsLeftRight,
  PhHammer,
  PhTreasureChest
} from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { ItemRelationView } from '../types/wiki'
import { hasTradeExchange } from '../utils/itemRelations'

defineProps<{
  relations: ItemRelationView[]
}>()

const NuxtLink = resolveComponent('NuxtLink')
const relationIcons: Record<ItemRelationView['kind'], Component> = {
  recipe: PhHammer,
  trade: PhArrowsLeftRight,
  loot: PhTreasureChest
}
</script>

<style scoped lang="scss">
.relations {
  max-width: 880px;
  margin: 0;
  padding: 0;
  list-style: none;

  li + li {
    border-top: 1px solid var(--edge);
  }
}

.relation {
  min-height: 68px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  color: inherit;
  text-decoration: none;

  &.linked:hover,
  &.linked:focus-visible {
    .copy strong,
    .arrow {
      color: var(--accent);
    }
  }

  .visual {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    background: var(--slot-surface);
    box-shadow:
      inset 2px 2px 0 var(--slot-shadow),
      inset -2px -2px 0 var(--slot-highlight);
  }

  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;

    strong {
      transition: color 120ms ease;
    }

    small {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }
  }

  .arrow {
    color: var(--muted);
    transition:
      color 120ms ease,
      transform 120ms ease;
  }

  &.linked:hover .arrow,
  &.linked:focus-visible .arrow {
    transform: translateX(3px);
  }
}

@media (max-width: 560px) {
  .relation {
    grid-template-columns: 44px minmax(0, 1fr);

    .arrow {
      display: none;
    }
  }
}
</style>
