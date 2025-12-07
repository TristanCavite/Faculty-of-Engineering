<template>
  <div class="max-w-4xl px-4 py-5 mx-auto mb-4 border rounded">
    <!-- Back button -->
    <div class="mb-2">
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
      <h1 class="mb-2 text-3xl font-bold text-red-900">{{ research.title }}</h1>

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
      <div v-if="coverImages.length">
        <UiCarousel class="relative w-full mb-8 max-w-none md:max-w-7xl" :plugins="[Autoplay({ delay: 4000 })]"
          @init-api="setCarouselApi">
          <UiCarouselContent> 
            <UiCarouselItem v-for="(img, index) in coverImages" :key="index">
              <div class="flex flex-shrink-0 cursor-pointer aspect-video" @click="openPhotoModal(img, `Slide ${index + 1}`)">
                <img
                  :src="img"
                  class="object-cover w-full h-56 md:h-[400px] rounded-xl"
                  :alt="research.title || `Slide ${index + 1}`"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="high"
                />
              </div>
            </UiCarouselItem>
          </UiCarouselContent>

           <UiCarouselPrevious
              class="!absolute !left-2 md:!left-none !top-1/2 !-translate-y-1/2 !aspect-auto !md:h-12 !md:w-10 !rounded-full !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900"
              iconClass="size-5 md:size-6 text-white"
            />
            <UiCarouselNext
              class="!absolute !right-2 md:!right-none !top-1/2 !-translate-y-1/2 !aspect-auto !md:h-12 !md:w-10 !rounded-full !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900"
              iconClass="size-5 md:size-6 text-white"
            />
            <!-- Dots -->
            <div class="absolute z-10 flex gap-2 transform -translate-x-1/2 bottom-3 left-1/2">
              <span
                v-for="(_, index) in coverImages"
                :key="index"
                class="rounded-full size-2"
                 :class="carouselCurrentSlide === index ? 'bg-red-900 scale-125' : 'bg-gray-300'"
               @click="scrollToSlide(index)"
              />
            </div>
        </UiCarousel>
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
      <PhotoModal
        v-model="showPhotoModal"
        :src="photoModalSrc"
        :alt="photoModalAlt"
        @close="showPhotoModal = false"
      />
    </div>
    <div v-else="research" class="mt-20 text-center text-gray-500">Loading research...</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import Autoplay from 'embla-carousel-autoplay'
import { watchOnce } from '@vueuse/core'
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

//Photo modal state
const showPhotoModal = ref(false)
const photoModalSrc = ref("")
const photoModalAlt = ref("")

function openPhotoModal(src: string, alt?: string) {
  photoModalSrc.value = src
  photoModalAlt.value = alt || ""
  showPhotoModal.value = true
}

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

const carouselApi = ref<any>()
const carouselCurrentSlide = ref(0)

function setCarouselApi(api: any) {
  carouselApi.value = api
  if (api) {
    carouselCurrentSlide.value = api.selectedScrollSnap()
    api.on('select', () => {
      carouselCurrentSlide.value = api.selectedScrollSnap()
    })
  }
}

function scrollToSlide(index: number) {
  carouselApi.value?.scrollTo(index)
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
