<template>
  <article class="target-page">
    <NuxtLink class="back-link" to="/items">
      <PhArrowLeft :size="18" aria-hidden="true" />
      Все предметы
    </NuxtLink>

    <header class="heading">
      <span class="icon">
        <img
          v-if="target.stack.icon"
          :src="useAssetPath(target.stack.icon)"
          alt=""
          width="72"
          height="72"
        >
      </span>
      <div>
        <p class="eyebrow">Ресурс Matcha</p>
        <h1><MinecraftText :text="target.title" /></h1>
        <p class="lead">{{ summary }}</p>
      </div>
    </header>

    <aside
      v-if="target.vanillaName && target.vanillaName !== target.stack.name"
      class="vanilla-note"
    >
      <strong>Что заменено</strong>
      <p>
        В обычном Minecraft этот предмет называется
        «{{ target.vanillaName }}». Matcha использует его как основу,
        но меняет название и роль в прогрессии.
      </p>
    </aside>

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Получение</p>
        <h2>Где взять</h2>
      </header>
      <ItemRelationList :relations="sources" />
      <div v-if="recipes.length" class="recipes">
        <h3>Изготовить самому</h3>
        <RecipeViewer
          v-for="recipe in recipes"
          :key="recipe.id"
          :recipe="recipe"
        />
      </div>
    </section>

    <ItemCraftingPath :target="craftingTarget" />

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Применение</p>
        <h2>Где используется</h2>
      </header>
      <ItemRelationList v-if="uses.length" :relations="uses" />
      <p v-else class="empty-note">
        Прямого применения в рецептах и обменах не найдено.
      </p>
    </section>
  </article>
</template>

<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'
import type { AcquisitionTarget } from '../types/acquisition'

const props = defineProps<{
  target: AcquisitionTarget
}>()

const catalog = useWikiCatalog()
const summary = computed(() => acquisitionTargetSummary(props.target))
const sources = computed(() => acquisitionTargetSources(catalog, props.target))
const recipes = computed(() => recipesProducingAcquisitionTarget(
  catalog,
  props.target
))
const uses = computed(() => acquisitionTargetUses(catalog, props.target))
const craftingTarget = computed(() => targetForAcquisitionTarget(
  props.target,
  catalog
))
</script>

<style scoped lang="scss">
.target-page {
  .heading {
    max-width: 960px;
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    align-items: start;
    gap: 26px;

    h1 {
      font-size: clamp(2.2rem, 5vw, 4.2rem);
    }
  }

  .icon {
    width: 104px;
    height: 104px;
    display: grid;
    place-items: center;
    background: var(--surface-quiet);

    img {
      image-rendering: pixelated;
    }
  }

  .lead {
    max-width: 720px;
    margin: 14px 0 0;
    font-size: 18px;
    line-height: 1.6;
  }

  .vanilla-note {
    max-width: 760px;
    margin-top: 34px;
    padding: 16px 18px;
    background: var(--surface-quiet);
    border-left: 3px solid var(--accent);

    p {
      margin: 5px 0 0;
      color: var(--muted);
      line-height: 1.55;
    }
  }

  .recipes {
    display: grid;
    gap: 22px;
    margin-top: 34px;
  }

  .empty-note {
    color: var(--muted);
  }

  @media (max-width: 620px) {
    .heading {
      grid-template-columns: 72px minmax(0, 1fr);
      gap: 16px;
    }

    .icon {
      width: 72px;
      height: 72px;

      img {
        width: 54px;
        height: 54px;
      }
    }
  }
}
</style>
