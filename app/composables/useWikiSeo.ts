import type { MaybeRefOrGetter } from 'vue'
import {
  SITE_IMAGE_PATH,
  SITE_NAME,
  canonicalWikiUrl
} from '~/utils/siteMeta'

interface WikiSeoOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  indexable?: MaybeRefOrGetter<boolean>
}

export function useWikiSeo(options: WikiSeoOptions): void {
  const route = useRoute()
  const runtimeConfig = useRuntimeConfig()
  const title = computed(() => toValue(options.title))
  const description = computed(() => toValue(options.description))
  const indexable = computed(() => toValue(options.indexable ?? true))
  const canonicalUrl = computed(() => canonicalWikiUrl(
    runtimeConfig.public.siteUrl,
    route.path
  ))
  const websiteUrl = canonicalWikiUrl(runtimeConfig.public.siteUrl)
  const imageUrl = canonicalWikiUrl(runtimeConfig.public.siteUrl, SITE_IMAGE_PATH)

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    robots: () => indexable.value
      ? 'index, follow, max-image-preview:large'
      : 'noindex, nofollow',
    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogSiteName: SITE_NAME,
    ogLocale: 'ru_RU',
    ogType: 'website',
    ogUrl: () => canonicalUrl.value,
    ogImage: imageUrl,
    ogImageType: 'image/png',
    ogImageWidth: 540,
    ogImageHeight: 540,
    ogImageAlt: SITE_NAME,
    twitterCard: 'summary',
    twitterTitle: () => title.value,
    twitterDescription: () => description.value,
    twitterImage: imageUrl,
    twitterImageAlt: SITE_NAME
  })

  useHead(() => ({
    script: indexable.value ? [
      {
        key: 'webpage-structured-data',
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${canonicalUrl.value}#webpage`,
          url: canonicalUrl.value,
          name: title.value,
          description: description.value,
          inLanguage: 'ru-RU',
          isPartOf: {
            '@id': `${websiteUrl}#website`
          },
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: imageUrl,
            width: 540,
            height: 540
          }
        })
      }
    ] : []
  }))
}
