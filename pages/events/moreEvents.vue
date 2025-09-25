<template>
  <main class="max-w-4xl p-6 mx-auto space-y-6">
     
    <div class="max-w-6xl px-4 mx-auto">
      <div class="flex flex-row items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-maroon">All Events</h1>
          <p class="mt-1 text-sm text-gray-600">
            Browse all events —
            <span v-if="!isLoading">{{ events.length }}</span>
            <span v-else class="text-gray-400">loading…</span>
            total
          </p>
        </div>
        <UiButton class="flex flex-row py-1 text-sm font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300" @click="goBack">
          <MoveLeft class="size-5" />
          Back to Home
        </UiButton>
      </div>

      <!-- Filters: Event type chip (reusable) + Year select -->
      <div class="flex items-center gap-4 mb-6">
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
            <h2 class="text-xl font-semibold text-gray-800">Oops — No events found</h2>
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
              <button
                @click="clearFilters"
                class="px-3 py-1 text-sm border rounded text-maroon hover:bg-gray-100"
                type="button"
              >
                Show all events
              </button>
            </div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <article
            v-for="ev in paginatedEvents"
            :key="ev.id"
            class="p-4 bg-white border rounded-lg shadow-sm"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="text-xs font-semibold tracking-wide uppercase text-maroon">
                {{ labelForType(ev.eventType) }}
              </div>
              <div class="text-xs italic text-gray-500">
                {{ formatPublishDate(ev.createdAt ?? ev.date) }}
              </div>
            </div>

            <h2 class="mt-2 text-lg font-bold text-gray-900 hover:text-maroon">
              <button @click="openEvent(ev.id)" class="text-left" type="button">
                {{ ev.title }}
              </button>
            </h2>

            <div class="mt-2 text-sm text-gray-700">
              <span class="font-semibold">Event Date:</span>
              {{ formatEventDate(ev.date, ev.dateEnd) }}
            </div>

            <div class="mt-2 text-sm text-gray-700">
              <span class="font-semibold">Type:</span> {{ labelForType(ev.eventType) }}
            </div>

            <div v-if="ev.description" class="mt-3 text-sm text-gray-600">
              <div v-html="truncateHtml(ev.description, 220)"></div>
            </div>

            <div class="mt-3">
              <button
                @click="openEvent(ev.id)"
                class="text-sm font-semibold text-gray-700 hover:text-maroon"
                type="button"
              >
                Read more →
              </button>
            </div>
          </article>
        </div>

        <div v-if="listByFilters.length > 0" class="flex items-center justify-center gap-4 mt-8">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="text-sm text-maroon disabled:opacity-30"
            type="button"
          >
            Prev
          </button>

          <div class="flex items-center gap-2">
            <button
              v-for="p in pageRange"
              :key="p"
              @click="goToPage(p)"
              :class="[ 'px-3 py-1 rounded border text-sm', p === currentPage ? 'bg-gray-100' : 'bg-white' ]"
              type="button"
            >
              {{ p }}
            </button>
          </div>

          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="text-sm text-maroon disabled:opacity-30"
            type="button"
          >
            Next
          </button>

          <button
            @click="goToPage(totalPages)"
            :disabled="currentPage === totalPages"
            class="text-sm text-maroon disabled:opacity-30"
            type="button"
          >
            End
          </button>
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
import { useRouter } from "vue-router";
import { Frown, MoveLeft } from "lucide-vue-next";

const PAGE_SIZE = 10;
const currentPage = ref(1);
const events = ref<any[]>([]);
const db = useFirestore();
const router = useRouter();

const typeFilter = ref<string>("all");
const yearFilter = ref<string>("all");
const isLoading = ref(true);

function goBack() {
  router.push('/')
}
// Load events once on mount
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

// Helpers
function asDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val?.toDate === "function") return val.toDate();
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return null;
}
function normalizeType(v: any) {
  return String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Compute years available from the loaded events (descending)
const yearOptions = computed(() => {
  const set = new Set<number>();
  for (const e of events.value) {
    const d = asDate(e.date);
    if (d) set.add(d.getFullYear());
  }
  return Array.from(set).sort((a, b) => b - a);
});

// Apply both filters (type + year)
const listByFilters = computed(() => {
  let list = events.value.slice();
  if (typeFilter.value !== "all") {
    list = list.filter((e) => normalizeType(e.eventType) === typeFilter.value);
  }
  if (yearFilter.value !== "all") {
    const y = Number(yearFilter.value);
    list = list.filter((e) => {
      const d = asDate(e.date);
      return d ? d.getFullYear() === y : false;
    });
  }
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(listByFilters.value.length / PAGE_SIZE)));
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

function formatEventDate(start: any, end?: any): string {
  const s = asDate(start);
  if (!s) return "";
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const sStr = s.toLocaleDateString("en-US", opts);
  if (!end) return sStr;
  const e = asDate(end);
  return e ? `${sStr} - ${e.toLocaleDateString("en-US", opts)}` : sStr;
}
function formatPublishDate(val: any): string {
  const d = asDate(val);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

watch([typeFilter, yearFilter], () => {
  currentPage.value = 1;
});
watch(events, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
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
</style>
