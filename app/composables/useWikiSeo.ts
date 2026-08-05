import type { MaybeRefOrGetter } from 'vue'
import {
  SITE_IMAGE_PATH,
  SITE_NAME,
  canonicalWikiUrl
} from '~/utils/siteMeta'

interface WikiSeoOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
}

export function useWikiSeo(options: WikiSeoOptions): void {
  const route = useRoute()
  const runtimeConfig = useRuntimeConfig()
  const title = computed(() => toValue(options.title))
  const description = computed(() => toValue(options.description))
  const canonicalUrl = computed(() => canonicalWikiUrl(
    runtimeConfig.public.siteUrl,
    route.path
  ))
  const imageUrl = canonicalWikiUrl(runtimeConfig.public.siteUrl, SITE_IMAGE_PATH)

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    robots: 'index, follow',
    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogSiteName: SITE_NAME,
    ogLocale: 'ru_RU',
    ogType: 'website',
    ogUrl: () => canonicalUrl.value,
    ogImage: imageUrl,
    ogImageAlt: SITE_NAME,
    twitterCard: 'summary',
    twitterTitle: () => title.value,
    twitterDescription: () => description.value,
    twitterImage: imageUrl
  })
}
