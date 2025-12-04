<template>
  <div class="flex flex-col w-full space-y-6">
    <template v-if="filteredEvents.length > 0">
      <div
        v-for="event in filteredEvents"
        :key="event.id"
        class="w-full pt-5 pb-5 border rounded-lg bg-neutral-50"
      >
        <span
          class="pl-5 pr-5 font-semibold text-red-800 text-md font-inter md:text-2xl"
        >
          EVENT DATE: {{ formatEventDate(event.date, event.dateEnd) }}
        </span>

        <UiCarousel
          class="relative w-full max-w-none md:max-w-7xl"
          :plugins="[autoplay]"
          @init-api="(api) => setEventApi(event.id, api)"
        >
          <UiCarouselContent>
            <UiCarouselItem
              v-for="(img, i) in event.coverImages"
              :key="i"
            >
              <div
                class="flex flex-shrink-0 pt-4 pb-4 transition-transform duration-500"
                :style="{ transform: `translateX(-${event.currentSlide || 0}00%)` }"
              >
                <div
                  class="flex-shrink-0 w-full cursor-pointer"
                  @click="openPhotoModal(img, '')"
                >
                  <img
                    :src="img"
                    alt=""
                    class="object-cover w-full h-64 rounded-md md:h-80 lg:h-96"
                  />
                </div>
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

          <div
            class="absolute z-10 flex space-x-2 -translate-x-1/2 left-1/2 bottom-6"
          >
            <span
              v-for="(img, i) in event.coverImages"
              :key="i"
              class="bg-gray-400 rounded-full size-2"
              :class="{ '!bg-gray-800 scale-125': getEventCurrentSlide(event.id) === i }"
              @click="setEventSlide(event.id, i)"
            />
          </div>
        </UiCarousel>

        <div class="pb-2 pl-5 pr-5 md:pt-2">
          <span class="text-xl font-semibold font-roboto md:text-2xl">
            {{ event.title }}
          </span>
          <div class="text-sm italic text-gray-600">
            Published: {{ formatPublishDate(event.createdAt) }}
          </div>
        </div>

        <div class="pl-5 pr-5 font-roboto">
          <p v-html="event.description"></p>
        </div>
        <div class="flex justify-between pl-5 pr-5 mt-4">
          <UiButton
            @click="readMore(event.id)"
            class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300"
          >
            Read more...
          </UiButton>
          <ShareButton
            :item="{
              id: event.id,
              type: 'event',
              slug: event.slug,
              title: event.title,
              excerpt: event.description,
            }"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="flex h-[420px] w-full flex-col items-center justify-center rounded-xl border bg-white text-center text-gray-500 shadow"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mb-4 text-red-700 h-14 w-14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8 2v2m8-2v2M3 8h18M5 8h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12l-6 6m0-6l6 6"
          />
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

    <!-- PHOTO MODAL (added, design of cards untouched) -->
    <PhotoModal
      v-model="showPhotoModal"
      :src="photoModalSrc"
      :alt="photoModalAlt"
      @close="showPhotoModal = false"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { collection, getDocs } from "firebase/firestore"
import { useFirestore } from "vuefire"
import Autoplay from "embla-carousel-autoplay"

import { useEventsCalendar, type EventRecord } from "@/composables/useEventsCalendar"

const db = useFirestore()
const router = useRouter()
const events = ref<EventRecord[]>([])

// Fetch events
onMounted(async () => {
  const snap = await getDocs(collection(db, "events"))
  events.value = snap.docs.map((doc) => ({
    id: doc.id,
    currentSlide: 0,
    ...doc.data(),
  })) as unknown as EventRecord[]
})

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

// Calendar and helpers
const {
  selectedDate,
  calendarAttributes,
  handleDayClick,
  formatEventDate,
  formatPublishDate,
  bySelectedDate,
  msFrom,
} = useEventsCalendar(events, { scrollTargetId: "events-list" })

const typeFilter = ref<string>("all") // v-model from EventFilter
const MAX_VISIBLE = 3

// Sort by date descending
const sortedByDateDesc = computed(() =>
  events.value.slice().sort((a, b) => msFrom(b.date) - msFrom(a.date)),
)

// Filter by event type
const listByType = computed(() => {
  if (typeFilter.value === "all") return sortedByDateDesc.value
  const normalizeType = (v: any) =>
    String(v || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  return sortedByDateDesc.value.filter(
    (e) => normalizeType(e.eventType) === typeFilter.value,
  )
})

// If you have a text filter, you can plug it here
// const textFilter = ref("")
// const listByTypeAndText = computed(() => { ... })

// Filter by selected date and limit to MAX_VISIBLE
const filteredEvents = computed<EventRecord[]>(() => {
  let result: EventRecord[] = []

  if (selectedDate.value) {
    // Apply date filter
    if (typeof bySelectedDate === "function") {
      const filterResult = (bySelectedDate as any)(listByType.value)
      if (Array.isArray(filterResult)) {
        result = filterResult as EventRecord[]
      } else if (typeof filterResult === "function") {
        result = listByType.value.filter(
          filterResult as (e: EventRecord) => boolean,
        )
      } else {
        result = listByType.value.filter(
          bySelectedDate as unknown as (e: EventRecord) => boolean,
        )
      }
    } else {
      // Fallback: match by date string
      result = listByType.value.filter((e) => {
        const maybeDate = (e as any).date
        const dateObj = maybeDate
          ? typeof (maybeDate as any).toDate === "function"
            ? (maybeDate as any).toDate()
            : new Date(maybeDate)
          : null
        const d = dateObj ? dateObj.toDateString() : ""
        const sel = selectedDate.value
          ? new Date(selectedDate.value as unknown as string)
          : null
        const selStr = sel ? sel.toDateString() : ""
        return d === selStr
      })
    }
  } else {
    result = listByType.value
  }

  // LIMIT TO 3 VISIBLE EVENTS
  return result.slice(0, MAX_VISIBLE)
})

// Clear date filter when changing type filter
watch(typeFilter, (val) => {
  if (val !== "all") selectedDate.value = null
})

// Navigation
function readMore(id: string) {
  router.push(`/events/${id}`)
}

// Photo modal
const showPhotoModal = ref(false)
const photoModalSrc = ref("")
const photoModalAlt = ref("")

function openPhotoModal(src: string, alt?: string) {
  photoModalSrc.value = src
  photoModalAlt.value = alt || ""
  showPhotoModal.value = true
}

// Autoplay plugin
const autoplay = Autoplay({ delay: 3000 })

// Optionally expose bits to parent (calendar, filters)
defineExpose({
  selectedDate,
  calendarAttributes,
  handleDayClick,
  typeFilter,
})

</script>

