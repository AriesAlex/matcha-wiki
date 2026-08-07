<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  canonicalWikiUrl
} from '~/utils/siteMeta'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const websiteUrl = canonicalWikiUrl(runtimeConfig.public.siteUrl)
const canonicalUrl = computed(() => canonicalWikiUrl(
  runtimeConfig.public.siteUrl,
  route.path
))

useHead(() => ({
  titleTemplate: title => !title || title === SITE_NAME
    ? SITE_NAME
    : `${title} · ${SITE_NAME}`,
  link: [
    { rel: 'canonical', href: canonicalUrl.value }
  ],
  script: [
    {
      key: 'website-structured-data',
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${websiteUrl}#website`,
        name: SITE_NAME,
        alternateName: 'Русская энциклопедия Matcha Flavoured',
        url: websiteUrl,
        description: SITE_DESCRIPTION,
        inLanguage: 'ru-RU'
      })
    }
  ]
}))
</script>
