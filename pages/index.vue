<template>
    <main class="bg-white">
      <!-- 🖼️ Hero Carousel -->
      <div class="relative flex flex-col items-center gap-5">
        <UiCarousel class="relative w-full max-w-none md:max-w-7xl" :plugins="[autoplay]" @init-api="setApi">
          <UiCarouselContent>
            <UiCarouselItem v-for="(img, i) in images" :key="i" class="basis-full">
              <div class="p-1">
                <div class="relative mx-auto w-[100%] md:w-[85%]" :style="{ paddingBottom: ratioPadding }">
                  <div class="absolute inset-0 overflow-hidden rounded-xl">
                    <div class="h-full shrink-0 grow-0">
                      <img :src="img.src" :alt="img.alt" class="object-cover object-center w-full h-full" loading="lazy" decoding="async"/>
                    </div>
                  </div>                  
                </div>
              </div>
            </UiCarouselItem>
          </UiCarouselContent>
          <UiCarouselPrevious class=" !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900 !aspect-auto !rounded-xl !w-10 !h-12 md:!h-28" iconClass="size-5 md:size-6 text-white"/>
          <UiCarouselNext class=" !bg-red-900 hover:!bg-red-950 disabled:!bg-red-900 !aspect-auto !rounded-xl !w-10 !h-12 md:!h-28" iconClass="size-5 md:size-6 text-white"/>
        </UiCarousel>
        <!-- Dots -->
        <div class="absolute z-10 flex space-x-2 transform -translate-x-1/2 bottom-2 left-1/2 md:bottom-4">
          <span v-for="(img, i) in images" :key="i" class="bg-gray-400 rounded-full size-1 md:size-2" :class="{ 'bg-gray-800': currentIndex === i }" @click="setCurrentSlide(i)" ></span>
        </div>
      </div>

    <!-- 📰 Events -->
    <div class="py-5 mx-auto md:max-w-7xl md:px-4 md:py-10">
      <!-- 🏷 Section Title -->
      <div class="text-center md:pt-4">
        <span class="text-xl font-extrabold tracking-wide uppercase font-playfair text-maroon md:text-5xl">EVENTS</span>
      </div>

      <div class="flex w-full gap-3 mt-4 mb-4">
        <div class="flex items-center w-24">
          <span class="text-sm font-bold text-gray-700 font-trajan">Type of Event:</span>
        </div>
        <div class="max-w-xs">
          <UiSelect v-model="typeFilter">
            <UiSelectTrigger placeholder="All">
              <component :is="selectedIcon" class="w-4 h-4 text-maroon" />
              <span >{{ TYPE_OPTIONS.find(opt => opt.value === typeFilter)?.label || 'All' }}</span>
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectGroup>
                <UiSelectItem v-for="(type, i) in TYPE_OPTIONS" :key="i" :value="type.value" :text="type.label">
                  <div class="flex items-row">
                    <component :is="type.icon" class="w-4 h-4 mr-2 text-gray-600" />
                    {{ type.label }}
                  </div>
                </UiSelectItem>
              </UiSelectGroup>
            </UiSelectContent>
          </UiSelect>
        </div>
        <!-- still useful if user filtered by date while 'All events' is selected -->
        <UiButton v-if="selectedDate" class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 transition bg-gray-200 rounded font-monserrat hover:scale-105 hover:bg-gray-300" @click="selectedDate = null">
          Clear date
        </UiButton>
      </div>
      

      <div id="events-list" class="flex flex-col justify-center md:flex-row md:gap-10 lg:gap-16">
        <!-- 📅 left side -->
        <div class="flex flex-col w-full space-y-6 md:w-3/4">
          <template v-if="filteredEvents.length > 0">
            <UiCard v-for="event in filteredEvents" :key="event.id" class="w-full font-semibold text-red-900 bg-white shadow-xl text-md md:text-2xl md:w-4/5 font-trajan" :title="`Event Date: ${new Date(event.date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}`">
              <template #content>
                <UiCardContent>
                  <div class="relative">
                    <UiCarousel class="relative w-full mx-auto max-w-none md:max-w-2xl" :plugins="[getAutoplay(event.id)]" @init-api="a => setApiFor(event.id, a)" >
                      <UiCarouselContent class="items-center">
                        <UiCarouselItem v-for="(img, i) in event.coverImages" :key="i" class="basis-full ">
                          <div class="inset-0 overflow-hidden rounded-xl">
                            <div class="h-full shrink-0 grow-0">
                              <img :src="img" alt="" class="object-cover w-full h-48 md:h-60" />
                            </div>
                          </div>
                        </UiCarouselItem>
                      </UiCarouselContent>
                      <UiCarouselPrevious class="z-50 !size-8 !bg-white/80 hover:!scale-105 hover:!bg-white md:!size-8 left-5" iconClass="size-4 md:size-5 text-red-900"/>
                      <UiCarouselNext class="z-50 !size-8 !bg-white/80 hover:!scale-105 hover:!bg-white md:!size-8 right-5" iconClass="size-4 md:size-5 text-red-900"/>    
                    </UiCarousel>
                    <div class="absolute z-10 flex space-x-2 transform -translate-x-1/2 md:bottom-5 left-1/2">
                      <span v-for="(_, i) in event.coverImages" :key="i" class="w-2 h-2 bg-black rounded-full" :class="{ 'bg-white': (indexById[event.id] ?? 0) === i }" @click="scrollTo(event.id, i)"></span>
                    </div>
                  </div>

                  <div class="flex flex-col pb-2 md:pt-2">
                    <span class="text-base font-semibold text-gray-700 font-roboto md:text-xl">{{ event.title }}</span>
                     <span class="text-sm italic text-gray-600"> Published: {{ formatPublishDate(event.createdAt) }} </span>
                  </div>
                  <p v-html="event.description" class="text-sm font-normal text-gray-600 font-roboto md:text-base"></p>

                  <div class="flex justify-between mt-2">
                    <UiButton @click="readMore(event.id)" class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300">
                      Read more...
                    </UiButton>
                    <ShareButton :item="{ id: event.id, type: 'event' }" />
                  </div>
                </UiCardContent>
              </template>
            </UiCard>
          </template>

          <template v-else>
            <!-- 🧼 Empty State -->
            <div class="flex min-h-[300px] w-224 flex-col items-center justify-center rounded border-2 bg-white text-center text-gray-500 shadow">
              <!-- Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mb-5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 2v2m8-2v2M3 8h18M5 8h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12l-6 6m0-6l6 6" />
              </svg>
              <p class="text-lg font-semibold">No events on this day.</p>
              <p class="text-sm">Try selecting another date on the calendar.</p>

              <UiButton v-if="selectedDate" @click="selectedDate = null" class="self-center px-4 py-2 mt-4 text-sm font-semibold text-gray-700 bg-gray-300 rounded w-fit hover:bg-gray-400">
                Show all events
              </UiButton>
            </div>
          </template>
        </div>

        <!--  Right Side -->  
        <div class="hidden md:flex md:w-[340px] md:shrink-0 md:flex-col md:items-center md:space-y-5">
          <div class="flex flex-col items-center space-y-5">
            <!-- Calendar -->
            <UiContainer class="p-6 bg-white shadow-xl rounded-xl">
               <AutoFitCalendar :attributes="calendarAttributes" v-model:selectedDate="selectedDate" @date-click="handleDayClick"/>
            </UiContainer>

            <!-- More / older events (only visible on All events with no date selected) -->
            <UiContainer v-if="oldEvents.length" class="p-6 bg-white border shadow-xl w-96 rounded-xl">
              <NuxtLink to="/events/moreEvents" class="flex items-center gap-2 pb-3 border-b border-neutral-300">
                <Clock class="size-5 text-maroon" />
                <span class="text-lg font-semibold text-maroon">More events</span>
              </NuxtLink>
              <ul class="mt-3 space-y-2 ">
                <li v-for="ev in oldEvents" :key="ev.id" class="flex items-center justify-between gap-3">
                  <UiButton class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 truncate transition bg-gray-200 rounded text-start w-72 font-montserrat hover:scale-105 hover:bg-gray-300" @click="readMore(ev.id)">
                    {{ ev.title }}
                  </UiButton>
                  <span class="text-xs text-gray-500 shrink-0">
                    {{ miniDate(ev.createdAt || ev.date) }}
                  </span>
                </li>
              </ul>
              <NuxtLink to="/events/moreEvents" class="flex items-center justify-end gap-1 mt-4 text-sm font-semibold text-maroon hover:scale-105">
                Show more events
                <MoveRight class="size-4" />
              </NuxtLink>
            </UiContainer>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { isSameDay, parseISO } from "date-fns";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { computed, onMounted, onUnmounted, ref, watch, nextTick, reactive } from "vue";
import { useRouter } from "vue-router";
import { useFirestore } from "vuefire";
import Autoplay from "embla-carousel-autoplay";
import { GraduationCap, ListFilter, School, Users, MoveRight, Clock} from "lucide-vue-next";

  const db = useFirestore();
  const images = ref<Array<{ src: string; alt?: string }>>([]);
  const typeFilter = ref<typeof TYPE_OPTIONS[number]['value']>('all')
  const events = ref<any[]>([]);
  const selectedDate = ref<Date | null>(null);
  const currentIndex = ref(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const api = ref<CarouselApi>();
  const totalCount = ref(0);
  const current = ref(0);
  const setCurrentSlide = (i: number) => api.value?.scrollTo(i)
  const router = useRouter();
  const MAX_VISIBLE = 3;
  const MAX_OLD_EVENTS = 10;
  const ratioPadding = '42.857%'; 
  const apiById = reactive<Record<string, any>>({})
  const indexById = reactive<Record<string, number>>({})
  const scrollTo = (id: string, i: number) => apiById[id]?.scrollTo(i)
  const autoplayById = reactive<Record<string, ReturnType<typeof Autoplay>>>({})

  // Options for the filter dropdown
  const TYPE_OPTIONS = [
    { value: "all", label: "All",  icon: ListFilter },
    { value: "faculty", label: "Faculty",  icon: School },
    { value: "students", label: "Students", icon: GraduationCap  },
    { value: "faculty-wide", label: "Faculty Wide",  icon: Users  },
  ] as const;
  const selectedIcon = computed(() => {
    return TYPE_OPTIONS.find((opt) => opt.value === typeFilter.value)?.icon || ListFilter;
  });

  const filteredEvents = computed(() => {
    const list = listByType.value;
    if (selectedDate.value) {
      return list.filter((e) => isSameDay(parseISO(e.date), selectedDate.value as Date));
    }
    return list.slice(0, MAX_VISIBLE);
  });

  const listByType = computed(() => {
    if (typeFilter.value === "all") return sortedByDateDesc.value;
    return sortedByDateDesc.value.filter(
      (e) => (e.eventType || "").toLowerCase().replace(/[_\s]+/g, "-") === typeFilter.value
    );
  });

  // Autoplay for main carousel
  const autoplay = Autoplay({
    delay: 3000,
  });

  function setApi(val: CarouselApi) {
    api.value = val;
  }

  watchOnce(api, (embla) => {
    if (!embla) return

    const updateFromApi = () => {
      const snap = embla.selectedScrollSnap()
      currentIndex.value = snap              
      current.value = snap + 1
    }

    totalCount.value = embla.scrollSnapList().length
    updateFromApi()
    embla.on('select', updateFromApi)
  })
  
  function getAutoplay(id: string) {
    if (!autoplayById[id]) {
      autoplayById[id] = Autoplay({
        delay: 3000,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
      })
    }
    return autoplayById[id]
  }

  function setApiFor(id: string, api: any) {
    apiById[id] = api
    const update = () => (indexById[id] = api.selectedScrollSnap())
    update()
    api.on('select', update)
  }

  const sortedByDateDesc = computed(() =>
    events.value.slice().sort((a, b) => msFrom(b.date) - msFrom(a.date))
  );

  onMounted(async () => {
    // Load events
    const snap = await getDocs(collection(db, "events"));
    events.value = snap.docs.map((doc) => ({
      id: doc.id,
      currentSlide: 0,
      ...doc.data(),
    }));
  });

  onMounted(async () => {
    // Load homepage gallery
    const q = query(collection(db, "homepage_gallery"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    images.value = snap.docs
    .map((d) => {
      const data: any = d.data();
      const src = data?.heroUrl || data?.imageUrl || data?.originalUrl || "";
      return { src, alt: data?.caption || "Homepage slide" };
    })
    .filter((i) => !!i.src);


    if (images.value.length === 0) {
      images.value = [
        { src: "/images/cet.jpg", alt: "Slide 1" },
        { src: "/images/cet1.jpg", alt: "Slide 2" },
        { src: "/images/cet2.jpg", alt: "Slide 3" },
        { src: "/images/cet3.jpg", alt: "Slide 4" },
      ];
    }

    await Promise.all(
      images.value.map((image) => {
        const img = new Image();
        img.src = image.src;
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  /** skeleton visibility (template still uses it) */
  const isContentVisible = ref(false)

  const calendarAttributes = computed(() => {
    const attrs: any[] = [];

    for (const e of events.value) {
      const start = asDate(e.date);
      const end = asDate(e.dateEnd);

      if (!start) continue;

      if (end && end > start) {
        // multi-day: highlight the span
        attrs.push({
          key: `range-${e.id}`,
          highlight: true,
          dates: { start, end },
          popover: { label: e.title || "Event" },
        });
      } else {
        // single-day: dot
        attrs.push({
          key: `dot-${e.id}-${+start}`,
          dates: start,
          dot: true,
          popover: { label: e.title || "Event" },
        });
      }
    }

    return attrs;
  });

  //  function formatEventDate(start: any, end?: any): string {
  //   // add this
  //   if (!start) return "";

  //   const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  //   const s = new Date(start).toLocaleDateString("en-US", opts);

  //   if (end) {
  //     const e = new Date(end).toLocaleDateString("en-US", opts);
  //     return `${s} - ${e}`;
  //   }

  //   return s;
  // }
  
  function miniDate(val: any): string {
    const d = typeof val?.toDate === "function" ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function inDayRange(e: any, day: Date): boolean {
    const s = asDate(e.date);
    if (!s) return false;

    // normalize to whole-day comparisons
    const d0 = new Date(day); d0.setHours(0,0,0,0);
    const s0 = new Date(s);  s0.setHours(0,0,0,0);

    const maybeEnd = asDate(e.dateEnd);
    if (maybeEnd) {
      const e0 = new Date(maybeEnd);
      e0.setHours(23,59,59,999); // inclusive end
      return d0 >= s0 && d0 <= e0;
    }
    // single-day event
    return d0.getTime() === s0.getTime();
  }

  //calendar filter
  function handleDayClick(d: Date) {
    // toggle if the same day is clicked again
    if (selectedDate.value && isSameDay(selectedDate.value, d)) {
      selectedDate.value = null
    } else {
      selectedDate.value = d
      // optional: ensure type filter doesn't hide the clicked date
      // typeFilter.value = 'all'
    }

    // smooth scroll to the events list
    nextTick(() => {
      document.getElementById('events-list')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }
  
  const asDate = (val: any): Date | null => {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val?.toDate === 'function') return val.toDate() // Firestore Timestamp
  if (typeof val === 'string' || typeof val === 'number') return new Date(val)
  return null
  }

  watch(typeFilter, (val) => {
    if (val !== "all") selectedDate.value = null;
  });

  // for events
  function formatPublishDate(val: any): string {
    // add this
    if (!val) return "";
    const d = typeof val?.toDate === "function" ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  
  function readMore(id: string) {
    router.push(`/events/${id}`);
  }

  function msFrom(val: any): number {
    if (!val) return 0;
    if (typeof val === "string") return +new Date(val);
    if (val instanceof Date) return +val;
    if (typeof val?.toMillis === "function") return val.toMillis();
    if (typeof val?.toDate === "function") return +val.toDate();
    return 0;
  }

  const oldEvents = computed(() => {
    return sortedByDateDesc.value // ALWAYS all events
      .slice(MAX_VISIBLE) // drop the first 3 newest
      .slice() // copy
      .sort(
        (
          a,
          b // newest by createdAt (fallback date)
        ) => msFrom(b.createdAt ?? b.date) - msFrom(a.createdAt ?? a.date)
      )
      .slice(0, MAX_OLD_EVENTS);
  });
  // const DOT_RED = '#ef4444' // or simply 'red'
  /** Option A: one dot per event (VCalendar stacks dots for same day) */
  // const dotEvents = computed(() => {
  //   return events.value
  //     .map((e: any) => {
  //       const d = asDate(e.date)
  //       if (!d) return null
  //       return {
  //         date: d,
  //         // color: DOT_RED,                // 🔴 always red
  //         label: e.title || 'Event',
  //       }
  //     })
  //     .filter(Boolean) as { date: Date; color: string; label?: string }[]
  // })
</script>

<style>
/* *{
  outline: 1px solid red;
} */
</style>