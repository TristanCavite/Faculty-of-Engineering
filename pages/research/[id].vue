<template>
  <div class="max-w-4xl px-4 py-5 mx-auto md:py-10">
    <!-- Back button -->
    <div class="mb-6">
      <UiButton
        variant="outline"
        class="flex flex-row px-2 py-1 text-sm font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300"
        @click="goBack"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-left-icon lucide-move-left size-5"><path d="M6 8L2 12L6 16"/><path d="M2 12H22"/></svg>
        Back to Research
      </UiButton>
    </div>

    <!-- Research Content -->
    <div v-if="research">
      <!-- Title -->
      <h1 class="mb-2 text-3xl font-bold text-maroon">{{ research.title }}</h1>

      <!-- Meta (Date • Department • Researchers) -->
      <div class="flex flex-wrap items-center mb-6 text-sm text-gray-600 gap-x-3 gap-y-1">
        <span v-if="research.date">{{ formatDate(research.date as any) }}</span>

        <template v-if="deptName">
          <span class="text-gray-400">•</span>
          <span><span class="font-medium text-gray-700">Department:</span> {{ deptName }}</span>
        </template>

        <template v-if="research.researchers">
          <span class="text-gray-400">•</span>
          <span><span class="font-medium text-gray-700">Researchers:</span> {{ research.researchers }}</span>
        </template>
      </div>

      <!-- Carousel -->
      <div v-if="coverImages.length" class="relative mb-8 overflow-hidden rounded-xl">
        <div
          class="flex transition-transform duration-700 ease-in-out"
          :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
        >
          <div
            v-for="(img, index) in coverImages"
            :key="index"
            class="md:h-[400px] w-full flex-shrink-0"
          >
            <img
              :src="img"
              class="w-full h-56 md:h-full object-covers"
              :alt="`Slide ${index + 1}`"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Arrows -->
        <button
          class="absolute z-10 p-2 transform -translate-y-1/2 rounded-full shadow left-4 top-1/2 bg-white/80 hover:bg-white "
          @click="prevSlide"
          aria-label="Previous image"
        >
          <ChevronLeft class="size-6 text-maroon" />
        </button>
        <button
          class="absolute z-10 p-2 transform -translate-y-1/2 rounded-full shadow right-4 top-1/2 bg-white/80 hover:bg-white"
          @click="nextSlide"
          aria-label="Next image"
        >
          <ChevronRight class="size-6 text-maroon" />
        </button>

        <!-- Dots -->
        <div class="absolute z-10 flex gap-2 transform -translate-x-1/2 bottom-3 left-1/2">
          <span
            v-for="(_, index) in coverImages"
            :key="index"
            class="rounded-full size-2"
            :class="currentSlide === index ? 'bg-maroon' : 'bg-gray-300'"
            @click="setSlide(index)"
          />
        </div>
      </div>

      <!-- Description -->
      <p v-if="research.description" class="text-gray-800 ">
        {{ research.description }}
      </p>

      <!-- Rich Content -->
      <div
        v-html="research.content"
        class="prose max-w-none prose-img:rounded"
      />
    </div>

    <div v-else class="mt-20 text-center text-gray-500">Loading research...</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-vue-next'

interface ResearchDoc {
  id: string
  title?: string
  description?: string
  content?: string
  date?: string | Date | Timestamp | { seconds: number, nanoseconds?: number }
  coverImages?: string[]
  imageUrl?: string
  researchers?: string
  departmentId?: string
  deptName?: string
}

const db = useFirestore()
const route = useRoute()
const router = useRouter()
const id = route.params.id as string

/** 1) Fetch on the SERVER so OG meta can be rendered */
const { data: research } = await useAsyncData<ResearchDoc | null>(
  `research-${id}`,
  async () => {
    const snap = await getDoc(doc(db, 'researches', id))
    if (!snap.exists()) return null
    const data = snap.data() as any

    // resolve department name (optional)
    let deptName = ''
    if (data?.departmentId) {
      try {
        const dsnap = await getDoc(doc(db, 'departments', data.departmentId))
        if (dsnap.exists()) {
          const d = dsnap.data() as any
          deptName = d?.name ?? d?.departmentName ?? d?.title ?? ''
        }
      } catch {}
    }

    return { id: snap.id, deptName, ...data } as ResearchDoc
  },
  { server: true, lazy: false }
)

/** 2) Derived UI state */
const coverImages = computed<string[]>(() => research.value?.coverImages ?? [])
const deptName   = computed(() => research.value?.deptName || '')

const currentSlide = ref(0)
let intervalId: ReturnType<typeof setInterval> | null = null

function nextSlide() {
  const len = coverImages.value.length
  if (len) currentSlide.value = (currentSlide.value + 1) % len
}
function prevSlide() {
  const len = coverImages.value.length
  if (len) currentSlide.value = (currentSlide.value - 1 + len) % len
}
function setSlide(index: number) {
  currentSlide.value = index
}

function goBack() { router.push('/research') }

function formatDate(ts?: Timestamp | { seconds: number } | Date | string | null) {
  if (!ts) return ''
  let d: Date
  if (typeof ts === 'string') d = new Date(ts)
  else if (ts instanceof Date) d = ts
  else if ('toDate' in (ts as any)) d = (ts as any).toDate()
  else d = new Date((ts as any).seconds * 1000)
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

/** 3) Auto-advance carousel (client only) */
onMounted(() => { intervalId = setInterval(nextSlide, 4000) })
onUnmounted(() => { if (intervalId) clearInterval(intervalId) })

/** 4) Social meta (Open Graph/Twitter) */
const runtime = useRuntimeConfig()
const base =
  (runtime.public?.SITE_URL as string) ||
  (process.env.NUXT_PUBLIC_SITE_URL as string) ||
  'https://cet-project2.vercel.app'
const absoluteUrl = (p: string) => (/^https?:\/\//i.test(p) ? p : base + p)

const heroImage = computed(() =>
  research.value?.imageUrl || coverImages.value[0] || '/images/og-default.jpg'
)
const ogImage = computed(() => absoluteUrl(heroImage.value))

useHead(() => {
  const r = research.value
  const title = r?.title ?? 'Research'
  const description =
    r?.description ??
    (r?.content ? (r.content as string).replace(/<[^>]*>/g, '').slice(0, 200) : '')
  const url = absoluteUrl(`/research/${id}`)

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
      { property: 'og:image', content: ogImage.value },
      { property: 'og:image:secure_url', content: ogImage.value },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },

      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage.value },
    ],
    link: [{ rel: 'canonical', href: url }],
  }
})
</script>

<style scoped>
.text-maroon { color: #740505; }
.bg-maroon { background-color: #740505; }
.border-maroon { border-color: #740505; }
</style>
