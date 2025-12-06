<template>
  <div class="flex flex-col w-full space-y-6">
    <!-- MAIN LIST -->
    <template v-if="filteredItems.length > 0">
      <article
        v-for="item in filteredItems"
        :key="item.id"
        class="w-full pt-5 pb-5 border rounded-lg bg-neutral-50"
      >
        <!-- DATE LABEL -->
        <span
          class="pl-5 pr-5 font-semibold text-red-800 text-md font-inter md:text-2xl"
        >
          {{ dateLabelComputed }}: {{ formatPrimaryDate(item) }}
        </span>

        <!-- CAROUSEL -->
        <UiCarousel
          class="relative w-full max-w-none md:max-w-7xl"
          :plugins="[autoplay]"
          @init-api="(api) => setItemApi(item.id, api)"
        >
          <UiCarouselContent>
            <UiCarouselItem
              v-for="(img, i) in item.coverImages"
              :key="i"
            >
              <div
                class="flex flex-shrink-0 pt-4 pb-4 transition-transform duration-500"
                :style="{ transform: `translateX(-${getItemCurrentSlide(item.id)}00%)` }"
              >
                <div
                  class="flex-shrink-0 w-full cursor-pointer"
                  @click="openPhotoModal(img, item.title)"
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

          <!-- DOTS -->
          <div
            class="absolute z-10 flex space-x-2 -translate-x-1/2 left-1/2 bottom-6"
          >
            <span
              v-for="(img, i) in item.coverImages"
              :key="i"
              class="bg-gray-400 rounded-full size-2"
              :class="{ '!bg-gray-800 scale-125': getItemCurrentSlide(item.id) === i }"
              @click="setItemSlide(item.id, i)"
            />
          </div>
        </UiCarousel>

        <!-- TITLE + PUBLISH DATE -->
        <div class="pb-2 pl-5 pr-5 md:pt-2">
          <span class="text-xl font-semibold font-roboto md:text-2xl">
            {{ item.title }}
          </span>
          <div class="text-sm italic text-gray-600">
            Published: {{ formatPublishDateSafe(item.createdAt) }}
          </div>
        </div>

        <!-- DESCRIPTION -->
        <div class="pl-5 pr-5 font-roboto">
          <p v-html="item.description"></p>
        </div>

        <!-- CTA + SHARE -->
        <div class="flex justify-between pl-5 pr-5 mt-4">
          <UiButton
            @click="readMore(item.id)"
            class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300"
          >
            Read more...
          </UiButton>

          <ShareButton
            :item="{
              id: item.id,
              type: effectiveItemType as 'event' | 'news' | 'research' | 'profile',
              slug: item.slug,
              title: item.title,
              excerpt: item.description,
            }"
          />
        </div>
      </article>
    </template>

    <!-- EMPTY STATE -->
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
        <p class="text-lg font-semibold">
          {{ emptyTitleComputed }}
        </p>
        <p class="text-sm">
          {{ emptySubtitleComputed }}
        </p>

        <UiButton
          v-if="selectedDate"
          @click="selectedDate = null"
          class="px-4 py-2 mt-4 text-sm font-semibold text-gray-700 bg-gray-300 rounded hover:bg-gray-400"
        >
          {{ showAllLabelComputed }}
        </UiButton>
      </div>
    </template>

    <!-- PHOTO MODAL (overlay, does not affect card design) -->
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

// Generic record: we piggyback on EventRecord shape + extras
type ContentRecord = EventRecord & {
  [key: string]: any
}

// ---------- PROPS (make it dynamic) ----------
const props = defineProps<{
  /** Array of events passed from parent */
  events?: ContentRecord[]
  /** Firestore collection name, e.g. "events", "news", "research" */
  collectionName: string
  /** Logical item type for ShareButton, e.g. "event", "news", "research" */
  itemType?: string
  /** Field to use for type-based filtering (default: "eventType") */
  typeField?: string
  /** Field to use as the primary date (default: "date") */
  primaryDateField?: string
  /** Custom label before the main date (default: "EVENT DATE") */
  dateLabel?: string
  /** Optional global text search (title + description HTML) */
  searchText?: string
  /** Limit number of visible items (default: 3) */
  maxVisible?: number
}>()

// ---------- CORE SETUP ----------
const db = useFirestore()
const router = useRouter()

const items = ref<ContentRecord[]>([])

// Watch for events prop changes and use it if provided
watch(
  () => props.events,
  (newEvents) => {
    if (newEvents) {
      items.value = newEvents.map(item => ({
        currentSlide: 0,
        ...item
      })) as ContentRecord[]
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // Only fetch if events not provided via prop
  if (!props.events) {
    const snap = await getDocs(collection(db, props.collectionName))
    items.value = snap.docs.map((doc) => ({
      id: doc.id,
      currentSlide: 0,
      ...doc.data(),
    })) as unknown as ContentRecord[]
  }
})

// ---------- Carousel API tracking ----------
const itemCarouselApis = ref<Map<string, any>>(new Map())
const itemCurrentSlides = ref<Map<string, number>>(new Map())

function setItemApi(itemId: string, emblaApi: any) {
  itemCarouselApis.value.set(itemId, emblaApi)

  if (emblaApi) {
    itemCurrentSlides.value.set(itemId, emblaApi.selectedScrollSnap())
    emblaApi.on("select", () => {
      itemCurrentSlides.value.set(itemId, emblaApi.selectedScrollSnap())
    })
  }
}

function getItemCurrentSlide(itemId: string): number {
  return itemCurrentSlides.value.get(itemId) ?? 0
}

function setItemSlide(itemId: string, slideIndex: number) {
  const api = itemCarouselApis.value.get(itemId)
  if (api) {
    api.scrollTo(slideIndex)
  }
}

// ---------- Calendar + date utilities ----------
const {
  selectedDate,
  calendarAttributes,
  handleDayClick,
  formatEventDate,
  formatPublishDate,
  bySelectedDate,
  msFrom,
} = useEventsCalendar(items as unknown as Ref<EventRecord[]>, {
  scrollTargetId: "events-list",
})

// ---------- Filtering ----------
const typeFilter = ref<string>("all") // can be wired to an external EventFilter if you want

const MAX_VISIBLE = computed(() => props.maxVisible ?? 3)
const primaryDateField = computed(() => props.primaryDateField || "date")
const typeField = computed(() => props.typeField || "eventType")
const search = computed(() => (props.searchText || "").trim().toLowerCase())

const isPublishedStatus = (value: any) =>
  String(value || "").toLowerCase().trim() === "published"

const sortedByDateDesc = computed(() =>
  items.value
    .filter((item: any) => isPublishedStatus(item.status))
    .slice()
    .sort((a, b) => {
      const aDate = (a as any)[primaryDateField.value]
      const bDate = (b as any)[primaryDateField.value]
      return msFrom(bDate) - msFrom(aDate)
    }),
)

// filter by type (if there is a type field)
const listByType = computed(() => {
  if (typeFilter.value === "all") return sortedByDateDesc.value

  const normalizeType = (v: any) =>
    String(v || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

  return sortedByDateDesc.value.filter((e) =>
    normalizeType((e as any)[typeField.value]) === typeFilter.value,
  )
})

// optional text filter (title + description html)
const listByTypeAndText = computed(() => {
  if (!search.value) return listByType.value

  return listByType.value.filter((item) => {
    const title = String(item.title || "").toLowerCase()
    const desc = String(item.description || "")
      .replace(/<[^>]*>/g, "")
      .toLowerCase()
    return title.includes(search.value) || desc.includes(search.value)
  })
})

// apply date filter (if selectedDate is used) + limit visible
const filteredItems = computed<ContentRecord[]>(() => {
  let result: ContentRecord[] = []

  if (selectedDate.value) {
    if (typeof bySelectedDate === "function") {
      const filterResult = (bySelectedDate as any)(listByTypeAndText.value)
      if (Array.isArray(filterResult)) {
        result = filterResult as ContentRecord[]
      } else if (typeof filterResult === "function") {
        result = listByTypeAndText.value.filter(
          filterResult as (e: ContentRecord) => boolean,
        )
      } else {
        result = listByTypeAndText.value.filter(
          bySelectedDate as unknown as (e: ContentRecord) => boolean,
        )
      }
    } else {
      // fallback: manual date match
      result = listByTypeAndText.value.filter((item) => {
        const rawDate = (item as any)[primaryDateField.value]
        const dateObj = rawDate
          ? typeof (rawDate as any).toDate === "function"
            ? (rawDate as any).toDate()
            : new Date(rawDate)
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
    result = listByTypeAndText.value
  }

  return result.slice(0, MAX_VISIBLE.value)
})

// when changing type filter, clear date selection (same as before)
watch(typeFilter, (val) => {
  if (val !== "all") selectedDate.value = null
})

// ---------- Date formatting helpers ----------
function formatPrimaryDate(item: ContentRecord): string {
  const rawDate = (item as any)[primaryDateField.value]
  const dateEnd = (item as any).dateEnd

  // For data that works with formatEventDate (events)
  if (rawDate && typeof formatEventDate === "function") {
    try {
      return formatEventDate(rawDate, dateEnd)
    } catch {
      // fallback below
    }
  }

  // Fallback: just format rawDate
  if (rawDate) {
    const d =
      typeof (rawDate as any).toDate === "function"
        ? (rawDate as any).toDate()
        : new Date(rawDate)
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    })
  }

  // Ultimate fallback: createdAt
  return formatPublishDateSafe((item as any).createdAt)
}

function formatPublishDateSafe(createdAt: any): string {
  if (!createdAt) return ""
  try {
    return formatPublishDate(createdAt as any)
  } catch {
    const d =
      typeof createdAt?.toDate === "function"
        ? createdAt.toDate()
        : new Date(createdAt)
    return d.toLocaleDateString()
  }
}

// ---------- Photo modal ----------
const showPhotoModal = ref(false)
const photoModalSrc = ref("")
const photoModalAlt = ref("")

function openPhotoModal(src: string, alt?: string) {
  photoModalSrc.value = src
  photoModalAlt.value = alt || ""
  showPhotoModal.value = true
}

// ---------- Navigation ----------
const effectiveItemType = computed(
  () =>
    props.itemType ||
    (props.collectionName.endsWith("s")
      ? props.collectionName.slice(0, -1)
      : props.collectionName),
)

function readMore(id: string) {
  // route: /events/:id, /news/:id, /research/:id, etc.
  router.push(`/${effectiveItemType.value}/${id}`)
}

// ---------- Labels (keep design, make text dynamic) ----------
const dateLabelComputed = computed(
  () => props.dateLabel || "EVENT DATE",
)

const emptyTitleComputed = computed(
  () => "No events on this day.",
)

const emptySubtitleComputed = computed(
  () => "Try selecting another date on the calendar.",
)

const showAllLabelComputed = computed(
  () => "Show all events",
)

// ---------- Autoplay plugin ----------
const autoplay = Autoplay({ delay: 3000 })

// Optionally expose calendar + filters to parent (if needed)
defineExpose({
  selectedDate,
  calendarAttributes,
  handleDayClick,
  typeFilter,
})
</script>

