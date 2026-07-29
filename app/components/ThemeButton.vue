<template>
  <button
    class="icon-button"
    type="button"
    title="Сменить цветовую тему"
    aria-label="Сменить цветовую тему"
    @click="toggle"
  >
    <PhMoon
      class="light-theme-icon"
      :size="20"
      weight="bold"
      aria-hidden="true"
    />
    <PhSun
      class="dark-theme-icon"
      :size="20"
      weight="bold"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { PhMoon, PhSun } from '@phosphor-icons/vue'

const { toggle } = useColorTheme()
</script>

<style scoped lang="scss">
.icon-button {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  background: transparent;
  border: 0;

  &:hover {
    color: var(--accent);
    background: var(--surface-quiet);
  }
}

.light-theme-icon {
  display: var(--light-theme-icon-display);
}

.dark-theme-icon {
  display: var(--dark-theme-icon-display);
}
</style>
