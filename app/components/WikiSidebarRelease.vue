<template>
  <div class="sidebar-release">
    <PhTranslate :size="20" aria-hidden="true" />
    <div>
      <strong>Русский форк ArieX</strong>
      <p>
        Ручная локализация и проверенные исправления. Один ZIP работает как
        data pack и resource pack.
      </p>
      <span class="release-links">
        <NuxtLink to="/fork">Что изменено</NuxtLink>
        <a href="https://github.com/AriesAlex/matcha-wiki/releases/latest">Скачать ZIP</a>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhTranslate } from '@phosphor-icons/vue'
</script>

<style scoped lang="scss">
.sidebar-release {
  display: flex;
  gap: 10px;
  margin-top: 32px;
  padding: 14px;
  background: var(--surface-quiet);

  > svg {
    flex: none;
    margin-top: 2px;
    color: var(--accent);
  }

  strong,
  p,
  a {
    display: block;
    font-size: 12px;
  }

  p {
    margin: 3px 0 9px;
    color: var(--muted);
    line-height: 1.45;
  }

  a {
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    font-weight: 800;
  }

  .release-links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 13px;
  }
}
</style>
