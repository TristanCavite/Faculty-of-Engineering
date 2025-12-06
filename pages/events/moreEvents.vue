<template>
  <main class="py-4 space-y-6 md:p-6">
    <div class="max-w-5xl mx-auto ">
      <div class="flex flex-col items-start mb-6">
        <div >
          <div class="flex flex-row items-center ml-6 space-x-3">
            <NuxtLink :to="{
                path: '/',
                query: {
                  type: typeFilter !== 'all' ? typeFilter : undefined,
                },
              }">
              <ArrowLeft class="text-red-900 cursor-pointer size-8 hover:scale-125" />
            </NuxtLink>
            <span class="text-3xl font-bold text-maroon">All Events</span>
          </div>
          <p class="mt-1 ml-6 text-sm text-gray-600">
            Browse all events —
            <span v-if="!isLoading">{{ filteredTotal }}</span>
            <span v-else class="text-gray-400">loading…</span>
            total
          </p>
        </div>
      </div>

      <!-- Filters: Event type chip (reusable) + Year select -->
      <div class="flex items-center gap-4 mb-6 ml-6">
        <EventFilter v-model="typeFilter" />
        <YearFilter v-model="yearFilter" :years="yearOptions" />
      </div>

      <div v-if="isLoading">
        <UiSearchSkeleton />
      </div>

      <div v-else>
        <div v-if="listByFilters.length === 0" class="mt-8">
          <div class="max-w-xl p-8 mx-auto text-center bg-white border rounded-lg shadow border-neutral-200">
            <Frown class="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <span class="text-xl font-semibold text-gray-800">Oops — No events found</span>
            <p class="mt-2 text-sm text-gray-600">
              <span v-if="typeFilter !== 'all' || yearFilter !== 'all'">
                There are no events matching
                <span v-if="typeFilter !== 'all'"> <strong>{{ displayFilterLabel(typeFilter) }}</strong></span>
                <span v-if="typeFilter !== 'all' && yearFilter !== 'all'"> and </span>
                <span v-if="yearFilter !== 'all'"> <strong>{{ yearFilter }}</strong></span>.
              </span>
              <span v-else>
                There are no events right now.
              </span>
            </p>
            <div class="flex items-center justify-center gap-3 mt-4">
              <UiButton @click="clearFilters" class="px-3 py-1 text-sm bg-gray-200 border rounded text-maroon hover:bg-gray-100">
                Show all events
              </UiButton>
            </div>
          </div>
        </div>

        <UiContainer v-else class="space-y-4 ">
          <article v-for="ev in paginatedEvents" :key="ev.id" class="p-5 space-y-3 bg-white border rounded-lg shadow-sm">
            <div class="flex justify-between">
              <div class="text-xs font-semibold tracking-wide uppercase text-maroon">
                {{ labelForType(ev.eventType) }}
              </div>
              <div class="text-xs italic text-gray-500">
                {{ formatPublishDate(ev.createdAt ?? ev.date) }}  
              </div>
            </div>

            <span class="text-lg font-bold text-gray-900 hover:text-maroon">
              <NuxtLink :to="`/events/${ev.id}`" class="text-left">
                {{ ev.title }}
              </NuxtLink>
            </span>

            <div class="text-sm text-gray-700">
              <span class="font-semibold">Event Date:</span>
              {{ formatEventDate(ev.date, ev.dateEnd) }}
            </div>

            <div v-if="ev.description" class="text-sm text-gray-600">
              <p v-html="truncateHtml(ev.description, 220)" class="truncate"></p>
            </div>
            
            <div>
              <NuxtLink :to="`/events/${ev.id}`" class="text-sm font-semibold text-gray-700 hover:text-maroon hover:scale-105">
                Read more →
              </NuxtLink>
            </div>
  
          </article>
        </UiContainer>

        <div v-if="listByFilters.length > 0" class="flex flex-col items-center gap-10 mt-5">
          <UiPagination v-model:page="currentPage" :total="listByFilters.length" :items-per-page="PAGE_SIZE" :sibling-count="1" class="mx-auto">
            <UiPaginationList v-slot="{ items }" class="gap-0 border rounded-lg">
              <UiPaginationPrev class="h-full rounded-e-none" as-child icon="lucide:chevron-left" />
              <template v-for="(page, index) in items" :key="index">
                <UiPaginationItem v-if="page.type === 'page'" as-child v-bind="page">
                  <UiButton
                    class="size-9 rounded-none border-0 shadow-none data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground dark:bg-transparent dark:data-[selected=true]:bg-primary dark:data-[selected=true]:text-primary-foreground"
                    variant="outline"
                    size="icon-sm">
                    {{ page.value }}
                  </UiButton>
                </UiPaginationItem>
                <UiPaginationEllipsis
                  v-else-if="page.type === 'ellipsis'"
                  as-child
                  v-bind="page"
                  icon="lucide:ellipsis"
                />
              </template>
              <UiPaginationNext class="h-full rounded-s-none" as-child icon="lucide:chevron-right" />
            </UiPaginationList>
          </UiPagination>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: "custom" });

import { ref, computed, onMounted, watch } from "vue";
import { useFirestore } from "vuefire";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useRouter, useRoute } from "vue-router";
import { Frown, ArrowLeft } from "lucide-vue-next";
import { NuxtLink } from "#components";
import type { Timestamp } from 'firebase/firestore'

type EventDate = Timestamp | Date | string | number | null | undefined

export interface EventRecord {
  id: string
  title: string
  createdAt?: EventDate
  date?: EventDate
  status?: string
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    items: EventRecord[]
    maxVisible?: number
    maxOldItems?: number
    headerLabel?: string
    seeAllLabel?: string
    seeAllRoute?: string
    itemRouteBase?: string
    /** 🔹 NEW: current type filter from parent (e.g. "faculty") */
    currentType?: string
  }>(),
  {
    maxVisible: 3,
    maxOldItems: 10,
    seeAllLabel: '',
    seeAllRoute: '/',
    itemRouteBase: '',
    currentType: 'all',
  },
)
const PAGE_SIZE = 5;
const currentPage = ref(1);

const events = ref<any[]>([]);
const db = useFirestore();
const router = useRouter();
const route = useRoute();

function msFrom(value: EventDate): number {
  if (!value && value !== 0) return 0
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') return new Date(value).getTime()
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof (value as any).toDate === 'function'
  ) {
    return (value as Timestamp).toDate().getTime()
  }
  return 0
}

const isLoading = ref(true);
const filteredTotal = computed(() => listByFilters.value.length)

// ---------- Filters ----------

// initialize from query (?type=faculty), fallback to "all"
// ---------- Filters ----------
const typeFilter = ref<string>("all");
const yearFilter = ref<string>("all");



// initialise from ?type= on first load
typeFilter.value = (route.query.type as string) || "all"

// when route changes (first load or navigation), update typeFilter
watch(
  () => route.query.type,
  (val) => {
    typeFilter.value = (val as string) || "all"
  },
  { immediate: true }, // run on initial mount
)

// when user changes EventFilter here, update ?type= in URL
watch(typeFilter, (val) => {
  const current = (route.query.type as string) || "all"
  if (val === current) return

  router.replace({
    query: {
      ...route.query,
      type: val !== "all" ? val : undefined,
    },
  })
})

function goBack() {
  router.push("/");
}

// ---------- Load events once on mount ----------
onMounted(async () => {
  isLoading.value = true;
  try {
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    events.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  } catch (err) {
    console.error("Failed to load events:", err);
    events.value = [];
  } finally {
    isLoading.value = false;
  }
});

const sortedByDateDesc = computed(() =>
  [...props.items]
    // you can also keep your status === "published" filter here if desired
    .sort(
      (a, b) =>
        msFrom(b.createdAt ?? b.date) - msFrom(a.createdAt ?? a.date),
    ),
)

const oldEvents = computed(() =>
  sortedByDateDesc.value.slice(0, props.maxOldItems),
)

function miniDate(value: EventDate): string {
  const time = msFrom(value)
  if (!time) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(time))
}

function readMore(id: string) {
  router.push(`${props.itemRouteBase}/${id}`)
}

/** 🔹 UPDATED: include ?type=<currentType> when navigating */
function goToMore() {
  const type = props.currentType ?? 'all'

  if (!props.seeAllRoute) return

  if (type === 'all') {
    router.push(props.seeAllRoute)
  } else {
    router.push({
      path: props.seeAllRoute,
      query: {
        type,
      },
    })
  }
}
// ---------- Helpers ----------
function asDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val?.toDate === "function") return val.toDate();
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return null;
}

function normalizeType(v: any) {
  return String(v || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeStatus(v: any) {
  return String(v || "").toLowerCase().trim();
}

// Years available from *published* events (descending)
const yearOptions = computed(() => {
  const set = new Set<number>();
  for (const e of events.value) {
    if (normalizeStatus(e.status) !== "published") continue;
    const d = asDate(e.date);
    if (d) set.add(d.getFullYear());
  }
  return Array.from(set).sort((a, b) => b - a);
});

// ---------- Apply status + type + year filters ----------
const listByFilters = computed(() => {
  // 1) only published events
  let list = events.value.filter(
    (e) => normalizeStatus(e.status) === "published",
  );

  // 2) type filter (EventFilter)
  if (typeFilter.value !== "all") {
    list = list.filter(
      (e) => normalizeType(e.eventType) === typeFilter.value,
    );
  }

  // 3) year filter (YearFilter)
  if (yearFilter.value !== "all") {
    const y = Number(yearFilter.value);
    list = list.filter((e) => {
      const d = asDate(e.date);
      return d ? d.getFullYear() === y : false;
    });
  }

  return list;
});

// ---------- Pagination ----------
const totalPages = computed(() =>
  Math.max(1, Math.ceil(listByFilters.value.length / PAGE_SIZE)),
);

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return listByFilters.value.slice(start, start + PAGE_SIZE);
});

function goToPage(page: number) {
  if (page < 1) page = 1;
  if (page > totalPages.value) page = totalPages.value;
  currentPage.value = page;
  if (process.client) window.scrollTo({ top: 0, behavior: "smooth" });
}

function openEvent(id: string) {
  router.push(`/events/${id}`);
}

function clearFilters() {
  typeFilter.value = "all";
  yearFilter.value = "all";
  currentPage.value = 1;
}

// ---------- Formatting / labels ----------
function formatEventDate(start: any, end?: any): string {
  const s = asDate(start);
  if (!s) return "";
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const sStr = s.toLocaleDateString("en-US", opts);
  if (!end) return sStr;
  const e = asDate(end);
  return e ? `${sStr} - ${e.toLocaleDateString("en-US", opts)}` : sStr;
}

function formatPublishDate(val: any): string {
  const d = asDate(val);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function labelForType(t: any): string {
  if (!t) return "General";
  const norm = String(t).toLowerCase();
  if (norm.includes("univ") || norm.includes("university")) return "University";
  if (norm.includes("faculty")) return "Faculty";
  if (norm.includes("student")) return "Students";
  if (norm.includes("department")) return "Department";
  if (norm.includes("general")) return "General";
  return capitalize(String(t));
}

function displayFilterLabel(val: string) {
  if (!val || val === "all") return "All events";
  return labelForType(val);
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncateHtml(html: string, max = 200) {
  const text = String(html || "").replace(/<[^>]+>/g, "");
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
}

// Reset page when filters change
watch([typeFilter, yearFilter], () => {
  currentPage.value = 1;
});

// Keep currentPage in range when events change
watch(events, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
});

// small helper to show a compact page range (up to 7 numbers)
const pageRange = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  const maxShown = 7;
  let start = Math.max(1, cur - Math.floor(maxShown / 2));
  let end = Math.min(total, start + maxShown - 1);
  if (end - start + 1 < maxShown) {
    start = Math.max(1, end - maxShown + 1);
  }
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
});
</script>




<style scoped>
button[disabled] { cursor: default; }
/* *{
  outline: 1px solid red;
} */
</style>
