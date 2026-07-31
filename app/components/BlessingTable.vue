<template>
  <section class="blessings" aria-labelledby="blessings-caption">
    <p id="blessings-caption" class="caption">
      Основа каждого рецепта — одна зачарованная книга. Нажмите на название,
      чтобы открыть точную раскладку.
    </p>

    <div class="head" aria-hidden="true">
      <span>Благословение</span>
      <span>Добавьте к книге</span>
      <span>Чары</span>
    </div>

    <ul>
      <li
        v-for="blessing in blessings"
        :key="blessing.id"
        class="blessing"
      >
        <NuxtLink
          class="identity"
          :to="blessing.recipePath"
          :aria-label="`Открыть рецепт: ${blessing.title}`"
        >
          <ItemSlotSurface
            :icon-url="useAssetPath(blessing.icon)"
            :display-name="blessing.title"
          />
          <strong><MinecraftText :text="blessing.title" /></strong>
        </NuxtLink>

        <div class="materials">
          <span class="mobile-label">Добавьте к книге</span>
          <span
            v-for="(material, index) in blessing.materials"
            :key="material.id"
            class="material"
          >
            <MinecraftText :text="material.ingredient.label" />
            <small v-if="material.count > 1">×{{ material.count }}</small>
            <span
              v-if="index < blessing.materials.length - 1"
            >, </span>
          </span>
        </div>

        <div class="enchantments">
          <span class="mobile-label">Чары</span>
          <div class="enchantment-list">
            <span
              v-for="(enchantment, index) in blessing.enchantments"
              :key="enchantment.id"
            >
              {{ enchantment.label }}<span
                v-if="index < blessing.enchantments.length - 1"
              >, </span>
            </span>
          </div>
          <small
            v-for="enchantment in blessing.enchantments.filter(entry => entry.description)"
            :key="`${enchantment.id}:description`"
            class="explanation"
          >
            <strong>{{ enchantment.name }}:</strong> {{ enchantment.description }}
          </small>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { buildBlessingRows } from '../utils/blessings'

const catalog = useWikiCatalog()
const blessings = buildBlessingRows(catalog)
</script>

<style scoped lang="scss">
.blessings {
  margin: 22px 0 42px;

  .caption {
    max-width: 760px;
    margin: 0 0 22px;
    color: var(--muted);
  }

  .head,
  .blessing {
    display: grid;
    grid-template-columns: minmax(270px, 0.9fr) minmax(260px, 1.2fr) minmax(230px, 1fr);
    gap: 20px;
  }

  .head {
    padding: 0 14px 9px;
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .blessing {
    align-items: center;
    padding: 14px;

    + .blessing {
      border-top: 1px solid var(--edge);
    }
  }

  .identity {
    min-width: 0;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    color: var(--ink);
    text-decoration: none;

    strong {
      min-width: 0;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    &:hover strong,
    &:focus-visible strong {
      color: var(--accent);
    }
  }

  .materials,
  .enchantments {
    min-width: 0;
    color: var(--ink);
    line-height: 1.45;
  }

  .material {
    small {
      margin-left: 3px;
      color: var(--accent-ink);
      font-size: inherit;
      font-weight: 700;
    }
  }

  .enchantments {
    color: var(--muted);

    .explanation {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;

      strong {
        color: var(--ink);
      }
    }
  }

  .mobile-label {
    display: none;
  }
}

@media (max-width: 820px) {
  .blessings {
    .head {
      display: none;
    }

    .blessing {
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 18px 4px;
    }

    .materials,
    .enchantments {
      padding-left: 56px;
    }

    .mobile-label {
      display: block;
      margin-bottom: 2px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
  }
}

@media (max-width: 480px) {
  .blessings {
    .materials,
    .enchantments {
      padding-left: 0;
    }
  }
}
</style>
