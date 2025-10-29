<template>
  <div class="max-w-4xl p-6 mx-auto space-y-6">
    <UiButton
      class="flex flex-row px-2 py-1 text-sm font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300"
      @click="goBack"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-left-icon lucide-move-left size-5"><path d="M6 8L2 12L6 16"/><path d="M2 12H22"/></svg>
       Back to News
    </UiButton>

    <img
      v-if="news?.imageUrl"
      :src="news.imageUrl"
      class="w-full max-h-[400px] object-cover rounded"
      alt="Cover image"
    />

    <h1 class="text-3xl font-bold text-maroon">{{ news?.title }}</h1>

    <div class="text-sm text-gray-500">
      <span>By {{ news?.author || 'Unknown' }}</span> |
      <span>{{ formatDate(news?.createdAt as any) }}</span>
    </div>

    <p class="text-lg text-gray-700">{{ news?.description }}</p>

    <div class="tiptap-render max-w-none" v-html="news?.content || ''"></div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { ref } from 'vue'

interface NewsDoc {
  id: string
  title?: string
  description?: string
  content?: string
  author?: string
  imageUrl?: string
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | Date
}

const route = useRoute()
const router = useRouter()
const db = useFirestore()
const id = route.params.id as string

// Load the document on the server (and client on nav) so head tags are SSR'd
const { data: news } = await useAsyncData<NewsDoc | null>(
  `news-${id}`,
  async () => {
    const snap = await getDoc(doc(db, 'news', id))
    if (!snap.exists()) return null
    const d = snap.data() as any
    return { id: snap.id, ...d } as NewsDoc
  },
  { server: true, lazy: false }
)

// Build absolute URL for og:url
const runtime = useRuntimeConfig()
const absoluteUrl = (path: string) =>
  (runtime.public?.SITE_URL || process.env.NUXT_PUBLIC_SITE_URL || 'https://cet-project2.vercel.app') + path

// Prefer the document image, else a local default share image in /public
const ogImage = absoluteUrl(news.value?.imageUrl || '/images/og-default.jpg')

useHead(() => {
  const n = news.value
  const title = n?.title ?? 'News'
  const description = n?.description ?? ''
  const url = absoluteUrl(`/news/${id}`)

  return {
    title,
    meta: [
      { name: 'description', content: description },

      // Open Graph (explicit, absolute)
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: url },
      { property: 'og:image', content: ogImage },
      // Optional but recommended for FB
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:secure_url', content: ogImage },

      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: ogImage },
    ],
    link: [{ rel: 'canonical', href: url }],
  }
})

function goBack() {
  router.push('/news')
}

function formatDate(ts?: Timestamp | { seconds: number } | Date | null) {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : 'toDate' in (ts as any) ? (ts as any).toDate() : new Date((ts as any).seconds * 1000)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
.bg-maroon { background-color: #740505; }
</style>
