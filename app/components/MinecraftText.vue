<template>
  <span
    class="minecraft-text"
    :aria-label="plainText"
  >
    <span
      v-for="(segment, index) in segments"
      :key="`${index}:${segment.text}`"
      :class="[
        `color-${segment.color}`,
        {
          bold: segment.bold,
          italic: segment.italics,
          underline: segment.underline,
          strikethrough: segment.strikethrough,
          obfuscated: segment.obfuscated
        }
      ]"
      aria-hidden="true"
    >{{ segment.text }}</span>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  text: string
}>()

const segments = computed(() => parseMinecraftFormatting(props.text))
const plainText = computed(() => stripMinecraftFormatting(props.text))
</script>

<style scoped lang="scss">
.minecraft-text {
  white-space: pre-wrap;

  .color-black {
    color: #000;
  }

  .color-dark_blue {
    color: #0000aa;
  }

  .color-dark_green {
    color: #00aa00;
  }

  .color-dark_aqua {
    color: #00aaaa;
  }

  .color-dark_red {
    color: #aa0000;
  }

  .color-dark_purple {
    color: #aa00aa;
  }

  .color-gold {
    color: #ffaa00;
  }

  .color-gray {
    color: #aaa;
  }

  .color-dark_gray {
    color: #555;
  }

  .color-blue {
    color: #5555ff;
  }

  .color-green {
    color: #55ff55;
  }

  .color-aqua {
    color: #55ffff;
  }

  .color-red {
    color: #ff5555;
  }

  .color-light_purple {
    color: #ff55ff;
  }

  .color-yellow {
    color: #ffff55;
  }

  .color-minecoin_gold {
    color: #ddd605;
  }

  .bold {
    font-weight: 800;
  }

  .italic {
    font-style: italic;
  }

  .underline {
    text-decoration: underline;
  }

  .strikethrough {
    text-decoration: line-through;
  }

  .underline.strikethrough {
    text-decoration: underline line-through;
  }

  .obfuscated {
    filter: blur(2px);
    letter-spacing: 0.06em;
    user-select: none;
  }
}
</style>
