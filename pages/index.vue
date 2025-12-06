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
              <div class="relative mx-auto w-full md:w-[85%] min-h-[240px] md:min-h-0" :style="{ paddingBottom: ratioPadding }">
                <div class="absolute inset-0 overflow-hidden rounded-xl ">
                  <div class="w-full h-full cursor-pointer" @click="openPhotoModal(img.src, img.alt)">
                    <img :src="img.src" :alt="img.alt" class="object-cover object-center w-full h-full" loading="lazy" decoding="async" />
                  </div>
                </div>
              </div>
            </div>
          </UiCarouselItem>
        </UiCarouselContent>
        
        <UiCarouselPrevious
          class="!absolute !left-2 md:!left-none !top-1/2 !-translate-y-1/2 !aspect-auto !md:w-10 !md:rounded-xl !rounded-full !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900 md:!h-28"
          iconClass="size-5 md:size-6 text-white"
        />
        <UiCarouselNext
          class="!absolute !right-2 md:!right-none !top-1/2 !-translate-y-1/2 !aspect-auto !md:w-10 !md:rounded-xl !rounded-full !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900 md:!h-28"
          iconClass="size-5 md:size-6 text-white"
        />
      </UiCarousel>

      <!-- Dots -->
      <div class="absolute z-10 flex space-x-2 transform -translate-x-1/2 bottom-2 left-1/2 md:bottom-4">
        <span
          v-for="(_, i) in images"
          :key="i"
          class="bg-gray-400 rounded-full size-2"
          :class="{ 'bg-gray-800': currentIndex === i }"
          @click="setCurrentSlide(i)"
        />
      </div>
    </div>

    <!-- EVENTS -->
    <div class="py-5 mx-auto md:max-w-7xl md:px-4 md:py-10">
      <div class="mt-4 mb-4 text-center md:mb-8">
        <span class="text-2xl font-extrabold tracking-wide uppercase font-playfair text-maroon md:text-5xl">
          EVENTS
        </span>
      </div>

      <!-- Filter bar -->
      <EventFilter v-model="typeFilter" class="ml-4 md:ml-10"/>
    
      <!-- Layout -->
      <div id="events-list" class="mt-2 md:mt-4 grid grid-cols-1 gap-10 md:grid-cols-[1fr_420px] md:px-10">
        <!-- LEFT: Events -->
        <EventsList :events="filteredEvents" 
          collection-name="events"
          item-type="event"
          primary-date-field="date"
          type-field="eventType"
          date-label="EVENT DATE"
          :search-text="eventSearchText"
        />

        <!-- RIGHT: Calendar + More -->
        <div class="hidden md:block">
          <div class="flex flex-col">
            <div class="flex justify-end">
              <UiButton
                v-if="selectedDate"
                class="px-2 py-1 mb-4 font-semibold text-white bg-red-900 rounded font-montserrat hover:bg-red-900 hover:scale-105"
                @click="selectedDate = null"
              >
                Clear Date Filter
              </UiButton>
            </div>
            <div class="mb-5 border rounded-xl">
              <ClientOnly>
                <AutoFitCalendar
                :attributes="calendarAttributes"
                v-model:selectedDate="selectedDate"
                @date-click="handleDayClick"
                class="custom-calendar"
                />
              </ClientOnly>
            </div>

            <MoreEvents
              :events="moreEvents"
              v-model:modelValue="showMoreEvents"
              :max-visible="MAX_VISIBLE"
              :max-old-events="MAX_OLD_EVENTS"
            />
          </div>
        </div>
         <!-- See all (mobile) -->
        <div class="text-center md:hidden">
          <UiButton
            @click="goToMore"
            class="text-base font-semibold text-red-900 bg-transparent hover:bg-transparent"
          >
            See all events...
          </UiButton>
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
import { collection, getDocs, orderBy, query, where } from "firebase/firestore" // ← added where
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useFirestore } from "vuefire"
import type { EventRecord as MoreEventsEventRecord } from "@/components/MoreEvents.vue"

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

/* ---------- Photo modal ---------- */
const showPhotoModal = ref(false)
const photoModalSrc = ref("")
const photoModalAlt = ref("")
const showMoreEvents = ref(true)

function openPhotoModal(src: string, alt?: string) {
  photoModalSrc.value = src
  photoModalAlt.value = alt || ""
  showPhotoModal.value = true
}

/* ---------- Events + calendar via composable ---------- */
const events = ref<EventRecord[]>([])

// Track carousel APIs and current slides for each event
const eventCarouselApis = ref<Map<string, any>>(new Map())
const eventCurrentSlides = ref<Map<string, number>>(new Map())

function setEventApi(eventId: string, emblaApi: any) {
  eventCarouselApis.value.set(eventId, emblaApi)
  
  if (emblaApi) {
    // Initialize current slide
    eventCurrentSlides.value.set(eventId, emblaApi.selectedScrollSnap())
    
    // Listen for slide changes
    emblaApi.on("select", () => {
      eventCurrentSlides.value.set(eventId, emblaApi.selectedScrollSnap())
    })
  }
}

function getEventCurrentSlide(eventId: string): number {
  return eventCurrentSlides.value.get(eventId) || 0
}

function setEventSlide(eventId: string, slideIndex: number) {
  const api = eventCarouselApis.value.get(eventId)
  if (api) {
    api.scrollTo(slideIndex)
  }
}

onMounted(async () => {
  // Prefer server-side filter
  const qRef = query(collection(db, "events"), where("published", "==", true))
  const snap = await getDocs(qRef)
  events.value = snap.docs
    .map((doc) => ({
      id: doc.id,
      currentSlide: 0,
      ...(doc.data() as any),
    }))
    // Extra safety: keep only published = true
    .filter((e: any) => e?.published === true) as unknown as EventRecord[]
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
const eventSearchText = ref<string>("")

const MAX_VISIBLE = 3
const MAX_OLD_EVENTS = 10

const sortedByDateDesc = computed(() =>
  events.value.slice().sort((a, b) => msFrom(b.date) - msFrom(a.date))
)

const listByType = computed(() => {
  if (typeFilter.value === "all") return sortedByDateDesc.value
  const normalizeType = (v: any) =>
    String(v || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  return sortedByDateDesc.value.filter(
    (e) => normalizeType(e.eventType) === typeFilter.value
  )
})

// Provide a version typed to the MoreEvents component's EventRecord type (ensures title is a string)
const moreEvents = computed<MoreEventsEventRecord[]>(() =>
  sortedByDateDesc.value
    .slice(MAX_VISIBLE)
    .slice()
    .sort((a, b) => msFrom(b.createdAt ?? b.date) - msFrom(a.createdAt ?? a.date))
    .slice(0, MAX_OLD_EVENTS)
    .map((e) => ({ ...e, title: e.title ?? "" })) as unknown as MoreEventsEventRecord[]
)

// Computed list used in the template; if a date is selected, apply calendar filtering.
// The composable exposes `bySelectedDate` which may be a predicate function or a ref to one.
// Update the filteredEvents computed property
const filteredEvents = computed(() => {
  let result: EventRecord[] = []
  
  if (selectedDate.value) {
    // If the composable provided a predicate function or a list-filtering function, handle both cases.
    if (typeof bySelectedDate === "function") {
      const filterResult = (bySelectedDate as any)(listByType.value)
      if (Array.isArray(filterResult)) {
        result = filterResult as EventRecord[]
      } else if (typeof filterResult === "function") {
        result = listByType.value.filter(filterResult as (e: EventRecord) => boolean)
      } else {
        result = listByType.value.filter(bySelectedDate as unknown as (e: EventRecord) => boolean)
      }
    } else if (typeof (bySelectedDate as any)?.value === "function") {
      const fn = (bySelectedDate as any).value
      const filterResult = fn(listByType.value)
      if (Array.isArray(filterResult)) {
        result = filterResult as EventRecord[]
      } else if (typeof filterResult === "function") {
        result = listByType.value.filter(filterResult as (e: EventRecord) => boolean)
      } else {
        result = listByType.value.filter(fn as unknown as (e: EventRecord) => boolean)
      }
    } else {
      // Fallback: match by date string
      result = listByType.value.filter((e) => {
        const maybeDate = (e as any).date
        const dateObj = maybeDate
          ? (typeof maybeDate.toDate === "function" ? maybeDate.toDate() : new Date(maybeDate))
          : null
        const d = dateObj ? dateObj.toDateString() : ""
        const sel = selectedDate.value ? new Date(selectedDate.value) : null
        const selStr = sel ? sel.toDateString() : ""
        return d === selStr
      })
    }
  } else {
    result = listByType.value
  }
  
  // LIMIT TO MAX_VISIBLE (3) EVENTS
  return result.slice(0, MAX_VISIBLE)
})

watch(typeFilter, (val) => { if (val !== "all") selectedDate.value = null })

/* ---------- Navigation ---------- */
function readMore(id: string) { router.push(`/events/${id}`) }
function goToMore() { router.push("/events/moreEvents") }
</script>

<style scoped>
/* *{ outline: 1px solid red; } */

/* Calendar background */
:deep(.custom-calendar .vc-container) {
  background-color: #fafafa !important; /* neutral-50 */
  border-radius: 0.75rem;
}

/* Hover on day cells - multiple selectors for broader coverage */
:deep(.custom-calendar .vc-day:hover),
:deep(.custom-calendar .vc-day:hover .vc-day-content),
:deep(.custom-calendar .vc-day button:hover),
:deep(.custom-calendar .vc-highlight:hover) {
  background-color: #fee2e2 !important; /* red-100 */
  cursor: pointer !important;
}

/* Selected date */
:deep(.custom-calendar .vc-day.is-selected) {
  background-color: #7f1d1d !important; /* red-900 */
  color: white;
}

/* Today's date */
:deep(.custom-calendar .vc-day.is-today) {
  background-color: #fca5a5 !important; /* red-300 */
}

/* Weekday labels */
:deep(.custom-calendar .vc-weekday) {
  color: #7f1d1d !important; /* red-900 */
  font-weight: 600;
}
</style>
