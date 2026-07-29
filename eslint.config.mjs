import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: [
    '.data/**',
    '.nuxt/**',
    '.output/**',
    'dist/**',
    'generated/**',
    'node_modules/**',
    'pack/**',
    'public/generated/**'
  ],
  rules: {
    'vue/multi-word-component-names': 'off'
  }
})
