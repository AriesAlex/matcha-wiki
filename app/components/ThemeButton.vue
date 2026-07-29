<template>
  <button
    class="icon-button"
    type="button"
    :title="theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'"
    @click="toggle"
  >
    <PhMoon
      v-if="theme === 'light'"
      :size="20"
      weight="bold"
    />
    <PhSun
      v-else
      :size="20"
      weight="bold"
    />
    <span class="visually-hidden">Сменить цветовую тему</span>
  </button>
</template>

<script setup lang="ts">
import { PhMoon, PhSun } from '@phosphor-icons/vue'

const { theme, toggle } = useColorTheme()
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
</style>
