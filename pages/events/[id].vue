<template>
  <main class="relative">
    <div class="mx-auto max-w-5xl space-y-3 px-5 pt-3 pb-4">
      <!-- Back -->
      <UiButton
        class="font-montserrat flex flex-row rounded bg-gray-200 text-sm font-semibold text-gray-800 transition hover:scale-105 hover:bg-gray-300"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-move-left-icon lucide-move-left size-5"
        >
          <path d="M6 8L2 12L6 16" />
          <path d="M2 12H22" />
        </svg>
        Back to Events
      </UiButton>

      <!-- Cover -->
      <img
        v-if="heroImage"
        :src="heroImage"
        alt="Event cover image"
        class="max-h-[400px] w-full rounded object-cover"
      />

      <!-- Title -->
      <h1 class="text-2xl font-bold text-maroon">
        {{ event?.title }}
      </h1>

      <!-- Meta -->
      <div class="text-sm text-gray-600">
        <span>{{ formatDate(event?.date as any) }}</span>
        <template v-if="event?.location"> • <span>{{ event.location }}</span></template>
      </div>

      <!-- Description -->
      <p class="text-gray-800">
        {{ event?.description }}
      </p>

      <!-- CONTENT -->
      <!-- 👇 IMPORTANT: use .tiptap-render (NOT .prose) to keep paragraph spacing tight -->
      <div class="tiptap-render max-w-none" v-html="event?.content || ''"></div>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { computed } from 'vue'

interface EventDoc {
  id: string
  title?: string
  description?: string
  content?: string
  date?: string | Date | Timestamp | { seconds: number; nanoseconds?: number }
  location?: string
  imageUrl?: string
  coverImages?: string[]
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | Date
}

const route = useRoute()
const router = useRouter()
const db = useFirestore()
const id = route.params.id as string

// Fetch event ON THE SERVER so OG tags are in the HTML
const { data: event } = await useAsyncData<EventDoc | null>(
  `event-${id}`,
  async () => {
    const snap = await getDoc(doc(db, 'events', id))
    if (!snap.exists()) return null
    const d = snap.data() as any
    return { id: snap.id, ...d } as EventDoc
  },
  { server: true, lazy: false }
)

// Build absolute URL (for OG)
const runtime = useRuntimeConfig()
const base =
  (runtime.public?.SITE_URL as string) ||
  (process.env.NUXT_PUBLIC_SITE_URL as string) ||
  'https://cet-project2.vercel.app'
const absoluteUrl = (path: string) => (/^https?:\/\//i.test(path) ? path : base + path)

// Prefer explicit imageUrl, else first of coverImages
const heroImage = computed(() => event.value?.imageUrl || event.value?.coverImages?.[0] || '')
const ogImage = absoluteUrl(heroImage.value || '/images/og-default.jpg')

// SEO / OG
useHead(() => {
  const e = event.value
  const title = e?.title ?? 'Event'
  const description =
    e?.description ??
    (e?.content ? (e.content as string).replace(/<[^>]*>/g, '').slice(0, 200) : '')
  const url = absoluteUrl(`/events/${id}`)

  return {
    title,
    meta: [
      { name: 'description', content: description },

      // Open Graph
      { property: 'og:type', content: 'article' },
      { property: 'og:site_name', content: 'College of Engineering' },
      { property: 'og:url', content: url },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: ogImage },
      { property: 'og:image:secure_url', content: ogImage },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },

      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage },
    ],
    link: [{ rel: 'canonical', href: url }],
  }
})

function goBack() {
  router.push('/')
}

function formatDate(ts?: Timestamp | { seconds: number } | Date | string | null) {
  if (!ts) return ''
  let d: Date
  if (typeof ts === 'string') d = new Date(ts)
  else if (ts instanceof Date) d = ts
  else if ('toDate' in (ts as any)) d = (ts as any).toDate()
  else d = new Date((ts as any).seconds * 1000)

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}
</script>
