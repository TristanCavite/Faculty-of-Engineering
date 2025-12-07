<template>
  <main class="py-4 space-y-6 md:p-6">
    <div class="max-w-5xl mx-auto ">
      <div class="flex flex-col items-start mb-6">
        <div >
          <div class="flex flex-row items-center ml-6 space-x-3">
            <NuxtLink to="/research">
              <ArrowLeft class="text-red-900 cursor-pointer size-8 hover:scale-125" />
            </NuxtLink>
            <span class="text-3xl font-bold text-maroon">All Research Publications</span>
          </div>
          <p class="mt-1 ml-6 text-sm text-gray-600">
            Browse all research publications —
            <span v-if="!isLoading">{{ researches.length }}</span>
            <span v-else class="text-gray-400">loading…</span>
            total
          </p>
        </div>
      </div>

      <!-- Filters: Year select -->
      <div class="flex items-center gap-4 mb-6 ml-6">
        <YearFilter v-model="yearFilter" :years="yearOptions" />
      </div>

      <div v-if="isLoading">
        <UiSearchSkeleton />
      </div>

      <div v-else>
        <div v-if="listByFilters.length === 0" class="mt-8">
          <div class="max-w-xl p-8 mx-auto text-center bg-white border rounded-lg shadow border-neutral-200">
            <Frown class="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <span class="text-xl font-semibold text-gray-800">Oops — No research publications found</span>
            <p class="mt-2 text-sm text-gray-600">
              <span v-if="yearFilter !== 'all'">
                There are no research publications matching
                <strong>{{ yearFilter }}</strong>.
              </span>
              <span v-else>
                There are no research publications right now.
              </span>
            </p>
            <div class="flex items-center justify-center gap-3 mt-4">
              <UiButton @click="clearFilters" class="px-3 py-1 text-sm bg-gray-200 border rounded text-maroon hover:bg-gray-100">
                Show all research publications
              </UiButton>
            </div>
          </div>
        </div>

        <UiContainer v-else class="space-y-4 ">
          <article v-for="r in paginatedResearches" :key="r.id" class="p-5 space-y-3 bg-white border rounded-lg shadow-sm">
            <div class="flex justify-between">
              <div class="text-xs font-semibold tracking-wide uppercase text-maroon">
                Research Publication
              </div>
              <div class="text-xs italic text-gray-500">
                {{ formatPublishDate(r.createdAt ?? r.date) }}  
              </div>
            </div>

            <span class="text-lg font-bold text-gray-900 hover:text-maroon">
              <NuxtLink :to="`/research/${r.id}`" class="text-left">
                {{ r.title }}
              </NuxtLink>
            </span>

            <div class="text-sm text-gray-700">
              <span class="font-semibold">Research Date:</span>
              {{ formatResearchDate(r.date) }}
            </div>

            <div v-if="r.researchers" class="text-sm text-gray-700">
              <span class="font-semibold">Researchers:</span>
              {{ r.researchers }}
            </div>

            <div v-if="r.description" class="text-sm text-gray-600">
              <p v-html="truncateHtml(r.description, 220)" class="truncate"></p>
            </div>
            
            <div>
              <NuxtLink :to="`/research/${r.id}`" class="text-sm font-semibold text-gray-700 hover:text-maroon hover:scale-105">
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
import { useRouter } from "vue-router";
import { Frown, ArrowLeft } from "lucide-vue-next";
import { NuxtLink } from "#components";

const PAGE_SIZE = 5;
const currentPage = ref(1);

const researches = ref<any[]>([]);
const db = useFirestore();
const router = useRouter();

const yearFilter = ref<string>("all");
const isLoading = ref(true);

function goBack() {
  router.push('/research')
}

// Load researches once on mount
onMounted(async () => {
  isLoading.value = true;
  try {
    const q = query(collection(db, "researches"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    researches.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  } catch (err) {
    console.error("Failed to load researches:", err);
    researches.value = [];
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

// Compute years available from the loaded researches (descending)
const yearOptions = computed(() => {
  const set = new Set<number>();
  for (const r of researches.value) {
    const d = asDate(r.date);
    if (d) set.add(d.getFullYear());
  }
  return Array.from(set).sort((a, b) => b - a);
});

// Apply year filter and published filter
const listByFilters = computed(() => {
  let list = researches.value.slice();
  
  // Filter out unpublished research
  list = list.filter((r) => r.isPublished === undefined || r.isPublished === true);
  
  if (yearFilter.value !== "all") {
    const y = Number(yearFilter.value);
    list = list.filter((r) => {
      const d = asDate(r.date);
      return d ? d.getFullYear() === y : false;
    });
  }
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(listByFilters.value.length / PAGE_SIZE)));
const paginatedResearches = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return listByFilters.value.slice(start, start + PAGE_SIZE);
});

function goToPage(page: number) {
  if (page < 1) page = 1;
  if (page > totalPages.value) page = totalPages.value;
  currentPage.value = page;
  if (process.client) window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearFilters() {
  yearFilter.value = "all";
  currentPage.value = 1;
}

function formatResearchDate(val: any): string {
  const d = asDate(val);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatPublishDate(val: any): string {
  const d = asDate(val);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function truncateHtml(html: string, max = 200) {
  const text = String(html || "").replace(/<[^>]+>/g, "");
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
}

watch(yearFilter, () => {
  currentPage.value = 1;
});

watch(researches, () => {
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
/* *{
  outline: 1px solid red;
} */
</style>