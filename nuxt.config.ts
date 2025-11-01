// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },

  modules: [
    "nuxt-vuefire",
    "@nuxtjs/tailwindcss",
    "@nuxtjs/color-mode",
    "@vueuse/nuxt",
    "@nuxt/icon",
    "@nuxt/fonts",
    "@vee-validate/nuxt",
    "@morev/vue-transitions/nuxt",
    "@yuta-inoue-ph/nuxt-vcalendar"
  ],

  tailwindcss: {
    exposeConfig: true,
    editorSupport: true,
  },

  css: [
    '~/assets/css/tiptap.css',
    '~/assets/css/tiptap-render.css',
    '~/assets/css/rich-content.css',
    '~/assets/css/main.css'
  ],

  colorMode: {
    classSuffix: "",
    preference: 'light',
    fallback: 'light',
    dataValue: 'light',
    storageKey: 'force-light-mode',
  },

  imports: {
    imports: [{
      from: "tailwind-variants",
      name: "tv",
    }, {
      from: "tailwind-variants",
      name: "VariantProps",
      type: true,
    }, {
      from: "vue-sonner",
      name: "toast",
      as: "useSonner"
    }],
  },

  devServer: {
    port: 4000 // 👈 Change Nuxt port to avoid conflict with backend
  },

  ssr: true,                               // enable SSR capability
  routeRules: {
    '/**':       { ssr: false },           // SPA everywhere
    '/news/**':  { ssr: true, isr: 600 },  // SSR only for news (cache 10 min)
    '/events/**': { ssr: true, isr: 600 },
    '/research/**':{ ssr: true, isr: 600 },
  },

  vuefire: {
    auth: {
      enabled: true,
    },

    config: {
      apiKey: process.env.NUXT_PUBLIC_API_KEY,
      authDomain: process.env.NUXT_PUBLIC_AUTH_DOMAIN,
      projectId: process.env.NUXT_PUBLIC_PROJECT_ID,
      storageBucket: process.env.NUXT_PUBLIC_STORAGE_BUCKET,
      messagingSenderId: process.env.NUXT_PUBLIC_MESSAGING_SENDER_ID,
      appId: process.env.NUXT_PUBLIC_APP_ID,
      // there could be other properties depending on the project
    },
  },

  build: {
    transpile: ["vue-sonner"]
  }
});