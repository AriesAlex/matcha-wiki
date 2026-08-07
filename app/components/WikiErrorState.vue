<template>
  <main class="error-page">
    <img
      class="error-icon"
      :src="useAssetPath('/generated/ui/pack.png')"
      alt=""
      width="160"
      height="160"
    >
    <p class="eyebrow">
      Путь зарос
    </p>
    <h1>{{ statusCode === 404 ? 'Такой страницы пока нет' : 'Не удалось открыть страницу' }}</h1>
    <p>{{ message || 'Вернитесь к карте знаний и попробуйте другой маршрут.' }}</p>
    <NuxtLink
      class="minecraft-button"
      to="/"
    >
      На главную
    </NuxtLink>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  statusCode?: number
  message?: string
}>()
</script>

<style scoped lang="scss">
.error-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  .error-icon {
    width: 160px;
    height: 160px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  h1 {
    max-width: 720px;
  }

  > p:not(.eyebrow) {
    max-width: 560px;
    color: var(--muted);
  }

  .minecraft-button {
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    margin-top: 18px;
    padding: 0 18px;
    color: var(--surface);
    background: var(--accent);
    font-weight: 800;
    text-decoration: none;
  }
}
</style>
