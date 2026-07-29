export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:resolved', (context) => {
    const basePath = useRuntimeConfig().app.baseURL.replace(/\/+$/, '')
    if (!basePath) {
      return
    }

    context.urls = context.urls.filter((url) => {
      const path = url._path?.pathname ?? new URL(url.loc, 'https://local.invalid').pathname
      // The prerender source reports app.baseURL as a second root page. The
      // renderer applies baseURL once more after this hook.
      return path.replace(/\/+$/, '') !== basePath
    })
  })
})
