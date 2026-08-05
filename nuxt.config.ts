import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COLOR_THEME_BOOTSTRAP_SCRIPT } from './app/utils/colorTheme'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? 'https://matcha.ariex.ru'

interface GeneratedRouteData {
  items?: Array<{ slug: string }>
  recipes?: Array<{ namespace: string, path: string }>
  traders?: Array<{ slug: string }>
  acquisition?: {
    targets?: Array<{ slug: string, itemSlug?: string }>
    locations?: Array<{ slug: string }>
    mobs?: Array<{ slug: string }>
  }
}

function generatedRoutes(): string[] {
  const catalogPath = resolve('generated/catalog.json')
  if (!existsSync(catalogPath)) {
    return []
  }

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as GeneratedRouteData
  return [
    ...(catalog.items ?? []).map(item => `/items/${item.slug}`),
    ...(catalog.acquisition?.targets ?? [])
      .filter(target => !target.itemSlug)
      .map(target => `/items/${target.slug}`),
    ...(catalog.recipes ?? []).map(recipe => `/recipes/${recipe.namespace}/${recipe.path}`),
    ...(catalog.traders ?? []).map(trader => `/traders/${trader.slug}`),
    ...(catalog.acquisition?.locations ?? [])
      .map(location => `/locations/${location.slug}`),
    ...(catalog.acquisition?.mobs ?? [])
      .map(mob => `/mobs/${mob.slug}`)
  ]
}

export default defineNuxtConfig({
  compatibilityDate: '2026-07-15',
  future: {
    compatibilityVersion: 5
  },
  modules: [
    '@nuxt/content',
    '@nuxtjs/sitemap',
    'nuxt-yandex-metrika',
    '@nuxt/eslint'
  ],
  css: [
    '@fontsource-variable/onest/index.css',
    '@fontsource/tiny5/400.css',
    '~/assets/styles/main.scss'
  ],
  app: {
    head: {
      htmlAttrs: {
        lang: 'ru'
      },
      title: 'Matcha Wiki',
      meta: [
        {
          name: 'description',
          content: 'Русская вики-энциклопедия Matcha Flavoured: предметы, рецепты, механики, прохождение и исправленный форк.'
        },
        {
          name: 'keywords',
          content: 'Matcha Flavoured вики, Matcha Flavoured википедия, Matcha Wiki, Minecraft датапак, русская энциклопедия Minecraft, рецепты Matcha Flavoured, гайд Matcha Flavoured'
        },
        {
          name: 'theme-color',
          content: '#203529'
        }
      ],
      script: [
        {
          key: 'color-theme',
          tagPosition: 'head',
          textContent: COLOR_THEME_BOOTSTRAP_SCRIPT
        }
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: `${process.env.NUXT_APP_BASE_URL ?? '/'}generated/ui/pack.png`
        }
      ]
    }
  },
  content: {
    renderer: {
      anchorLinks: {
        h2: true,
        h3: true,
        h4: true
      }
    }
  },
  nitro: {
    prerender: {
      // Nuxt otherwise uses CPU count × 4. Hundreds of catalog pages share
      // the same Content payloads, so that fan-out races atomic cache writes
      // on Windows and wastes work in CI.
      concurrency: 1,
      crawlLinks: true,
      failOnError: true,
      routes: [
        '/404.html',
        ...generatedRoutes()
      ]
    }
  },
  routeRules: {
    '/**': {
      prerender: true
    }
  },
  runtimeConfig: {
    public: {
      siteUrl
    }
  },
  site: {
    url: siteUrl
  },
  yandexMetrika: {
    id: '111206604',
    options: {
      accurateTrackBounce: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      trackLinks: true,
      webvisor: true
    }
  },
  sitemap: {
    autoLastmod: true,
    zeroRuntime: true
  },
  typescript: {
    strict: true,
    typeCheck: true
  },
  devtools: {
    enabled: false
  }
})
