<template>
  <main class="bg-white">
    <!-- 🖼️ Hero Carousel -->
    <div class="relative flex flex-col items-center gap-5">
      <UiCarousel
        class="relative w-full max-w-none md:max-w-7xl"
        :plugins="[autoplay]"
        @init-api="setApi"
      >
        <UiCarouselContent>
          <UiCarouselItem v-for="(img, i) in images" :key="i" class="basis-full">
            <div class="p-1">
              <div class="relative mx-auto w-[100%] md:w-[85%]" :style="{ paddingBottom: ratioPadding }">
                <div class="absolute inset-0 overflow-hidden rounded-xl">
                  <div class="h-full shrink-0 grow-0">
                    <img :src="img.src" :alt="img.alt" class="h-full w-full object-cover object-center" loading="lazy" decoding="async" />
                  </div>
                </div>
              </div>
            </div>
          </UiCarouselItem>
        </UiCarouselContent>

        <UiCarouselPrevious
          class="!aspect-auto !h-12 !w-10 !rounded-xl !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900 md:!h-28"
          iconClass="size-5 md:size-6 text-white"
        />
        <UiCarouselNext
          class="!aspect-auto !h-12 !w-10 !rounded-xl !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900 md:!h-28"
          iconClass="size-5 md:size-6 text-white"
        />
      </UiCarousel>

      <!-- Dots -->
      <div class="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 transform space-x-2 md:bottom-4">
        <span
          v-for="(_, i) in images"
          :key="i"
          class="size-1 rounded-full bg-gray-400 md:size-2"
          :class="{ 'bg-gray-800': currentIndex === i }"
          @click="setCurrentSlide(i)"
        />
      </div>
    </div>

    <!-- EVENTS -->
    <div class="py-5 mx-auto md:max-w-7xl md:px-4 md:py-10">
      <div class="text-center md:pt-4">
        <span class="text-xl font-extrabold tracking-wide uppercase font-playfair text-maroon md:text-5xl">
          EVENTS
        </span>
      </div>

      <!-- Filter bar -->
      <div class="mt-6 md:px-10 flex items-center justify-between gap-3">
        <EventFilter v-model="typeFilter" />
        <UiButton
          v-if="selectedDate"
          class="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          @click="selectedDate = null"
        >
          Clear date
        </UiButton>
      </div>

      <!-- Layout -->
      <div id="events-list" class="mt-4 grid grid-cols-1 gap-10 md:grid-cols-[minmax(680px,1fr)_420px] md:px-10">
        <!-- LEFT: Events -->
        <div class="flex flex-col w-full space-y-6">
          <template v-if="filteredEvents.length > 0">
            <div v-for="event in filteredEvents" :key="event.id" class="w-full p-5 bg-white rounded-lg shadow-2xl">
              <span class="font-semibold text-red-800 text-md font-inter md:text-2xl">
                EVENT DATE: {{ formatEventDate(event.date, event.dateEnd) }}
              </span>

              <div class="relative mx-auto overflow-hidden">
                <div class="flex flex-shrink-0 pt-4 pb-4 transition-transform duration-500" :style="{ transform: `translateX(-${event.currentSlide || 0}00%)` }">
                  <div v-for="(img, i) in event.coverImages" :key="i" class="flex-shrink-0 w-full">
                    <img :src="img" alt="" class="object-cover w-full h-64 md:h-80 lg:h-96" />
                  </div>
                </div>

                <button
                  class="absolute z-10 text-red-900 -translate-y-1/2 rounded-full shadow-md right-3 top-1/2 size-9 bg-white/80 hover:scale-105 hover:bg-white md:size-10"
                  @click="event.currentSlide = (event.currentSlide + 1) % event.coverImages.length"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>

                <button
                  class="absolute z-10 text-red-900 -translate-y-1/2 rounded-full shadow-md left-3 top-1/2 size-9 bg-white/80 hover:scale-105 hover:bg-white md:size-10"
                  @click="event.currentSlide = (event.currentSlide - 1 + event.coverImages.length) % event.coverImages.length"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>

                <div class="absolute z-10 flex space-x-2 -translate-x-1/2 bottom-4 left-1/2">
                  <span
                    v-for="(img, i) in event.coverImages"
                    :key="i"
                    class="w-2 h-2 bg-gray-400 rounded-full"
                    :class="{ 'bg-gray-800': (event.currentSlide || 0) === i }"
                    @click="event.currentSlide = i"
                  />
                </div>
              </div>

              <div class="pb-2 md:pt-2">
                <span class="text-xl font-semibold font-roboto md:text-2xl">{{ event.title }}</span>
                <div class="text-sm italic text-gray-600">Published: {{ formatPublishDate(event.createdAt) }}</div>
              </div>

              <div class="font-roboto"><p v-html="event.description"></p></div>
              <div class="flex justify-between">
                <UiButton
                  @click="readMore(event.id)"
                  class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300"
                >
                  Read more...
                </UiButton>
                <ShareButton :item="{ id: event.id, type: 'event', slug: event.slug, title: event.title, excerpt: event.description }" />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="flex h-[420px] w-full flex-col items-center justify-center rounded-xl border bg-white text-center text-gray-500 shadow">
              <svg xmlns="http://www.w3.org/2000/svg" class="mb-4 text-red-700 h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 2v2m8-2v2M3 8h18M5 8h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12l-6 6m0-6l6 6" />
              </svg>
              <p class="text-lg font-semibold">No events on this day.</p>
              <p class="text-sm">Try selecting another date on the calendar.</p>
              <UiButton
                v-if="selectedDate"
                @click="selectedDate = null"
                class="px-4 py-2 mt-4 text-sm font-semibold text-gray-700 bg-gray-300 rounded hover:bg-gray-400"
              >
                Show all events
              </UiButton>
            </div>
          </template>
        </div>

        <!-- RIGHT: Calendar + More -->
        <div class="hidden md:block md:w-[420px] md:justify-self-end">
          <div class="space-y-5">
            <div class="rounded-xl bg-white p-6 shadow-xl">
              <ClientOnly>
                <AutoFitCalendar
                  :attributes="calendarAttributes"
                  v-model:selectedDate="selectedDate"
                  @date-click="handleDayClick"
                />
              </ClientOnly>
            </div>

            <div v-if="oldEvents.length" class="p-6 bg-white border shadow-xl rounded-xl border-neutral-200">
              <div class="mb-3 flex cursor-pointer items-center gap-2 border-b border-neutral-300 pb-3" @click="goToMore" role="button" aria-label="View all events">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-maroon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 8v5l3 3 1.5-1.5L14 12.75V8h-2z" />
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM4 12a8 8 0 1116 0 8 8 0 01-16 0z" />
                </svg>
                <div class="text-lg font-semibold text-maroon hover:underline">More events</div>
                <svg xmlns="http://www.w3.org/2000/svg" class="ml-auto h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>

              <ul class="space-y-2">
                <li v-for="ev in oldEvents" :key="ev.id" class="flex items-start justify-between gap-3">
                  <button class="text-sm font-medium text-left text-gray-800 hover:underline" @click="readMore(ev.id)" type="button">
                    {{ ev.title }}
                  </button>
                  <span class="text-xs text-gray-500 shrink-0">{{ miniDate(ev.createdAt || ev.date) }}</span>
                </li>
              </ul>

              <div class="mt-4 hidden md:flex md:justify-end">
                <button @click="goToMore" class="text-sm font-semibold text-maroon hover:underline" type="button">
                  See all events →
                </button>
              </div>
              <div class="mt-4 text-center md:hidden">
                <button @click="goToMore" class="text-sm font-semibold text-maroon hover:underline" type="button">
                  See all events →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div> <!-- /grid -->
    </div>
  </main>
</template>

<script lang="ts" setup>
import EventFilter from "@/components/EventFilter.vue"
import AutoFitCalendar from "@/components/AutoFitCalendar.vue"
import { useEventsCalendar, type EventRecord } from "@/composables/useEventsCalendar"
import { watchOnce } from "@vueuse/core"
import Autoplay from "embla-carousel-autoplay"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useFirestore } from "vuefire"

const db = useFirestore()
const router = useRouter()

/* ---------- Hero carousel (top) ---------- */
const images = ref<Array<{ src: string; alt?: string }>>([])
const currentIndex = ref(0)
const ratioPadding = "42.857%"
const api = ref<any>()
const autoplay = Autoplay({ delay: 3000 })
function setApi(val: any) { api.value = val }

watchOnce(api, (embla) => {
  if (!embla) return
  const updateFromApi = () => { currentIndex.value = embla.selectedScrollSnap() }
  updateFromApi()
  embla.on("select", updateFromApi)
})
const setCurrentSlide = (i: number) => api.value?.scrollTo(i)

/* ---------- Events + calendar via composable ---------- */
const events = ref<EventRecord[]>([])

onMounted(async () => {
  const snap = await getDocs(collection(db, "events"))
  events.value = snap.docs.map((doc) => ({
    id: doc.id,
    currentSlide: 0,
    ...doc.data(),
  })) as unknown as EventRecord[]
})

const {
  selectedDate,
  calendarAttributes,
  handleDayClick,
  formatEventDate,
  formatPublishDate,
  miniDate,
  msFrom,
  bySelectedDate,
} = useEventsCalendar(events, { scrollTargetId: "events-list" })

/* ---------- Load homepage gallery images ---------- */
onMounted(async () => {
  const qRef = query(collection(db, "homepage_gallery"), orderBy("createdAt", "desc"))
  const snap = await getDocs(qRef)
  images.value = snap.docs
    .map((d) => {
      const data: any = d.data()
      const src = data?.heroUrl || data?.imageUrl || data?.originalUrl || ""
      return { src, alt: data?.caption || "Homepage slide" }
    })
    .filter((i) => !!i.src)

  if (images.value.length === 0) {
    images.value = [
      { src: "/images/cet.jpg", alt: "Slide 1" },
      { src: "/images/cet1.jpg", alt: "Slide 2" },
      { src: "/images/cet2.jpg", alt: "Slide 3" },
      { src: "/images/cet3.jpg", alt: "Slide 4" },
    ]
  }
})

/* ---------- Filtering / lists ---------- */
const typeFilter = ref<string>("all") // v-model from EventFilter

const MAX_VISIBLE = 3
const MAX_OLD_EVENTS = 10

const sortedByDateDesc = computed(() =>
  events.value.slice().sort((a, b) => msFrom(b.date) - msFrom(a.date))
)

const listByType = computed(() => {
  if (typeFilter.value === "all") return sortedByDateDesc.value
  const normalizeType = (v: any) =>
    String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  return sortedByDateDesc.value.filter(e => normalizeType(e.eventType) === typeFilter.value)
})

const filteredEvents = computed(() => bySelectedDate(listByType.value).slice(0, MAX_VISIBLE))
const oldEvents = computed(() =>
  sortedByDateDesc.value
    .slice(MAX_VISIBLE)
    .slice()
    .sort((a, b) => msFrom(b.createdAt ?? b.date) - msFrom(a.createdAt ?? a.date))
    .slice(0, MAX_OLD_EVENTS)
)

watch(typeFilter, (val) => { if (val !== "all") selectedDate.value = null })

/* ---------- Navigation ---------- */
function readMore(id: string) { router.push(`/events/${id}`) }
function goToMore() { router.push("/events/moreEvents") }
</script>

<style>
/* *{ outline: 1px solid red; } */
</style>
