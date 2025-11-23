<!-- pages/admin/super-admin/events/index.vue -->
<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage Events</h1>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/events/add_event')"
      >
        + Add Event
      </UiButton>
    </div>

    <!-- Filters + Search + View toggle -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <YearFilter v-model="selectedYear" :years="availableYears" />
      <EventFilter v-model="selectedType" />
      <StatusFilter v-model="selectedStatus" />
      <div class="md:ml-auto flex items-center gap-3">
        <!-- Shared search bar (debounced v-model) -->
        <ManageSearchBar v-model:query="searchQuery" placeholder="Search events…" />
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <!-- ================= LOADING SKELETONS ================= -->
    <template v-if="isLoading">
      <!-- Grid skeletons -->
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="grid" />
      </div>
      <!-- List skeletons -->
      <ul v-else class="divide-y rounded-xl border bg-white">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="list" />
      </ul>
    </template>

    <!-- ================= CONTENT (after search) ================= -->
    <template v-else-if="searchedEvents.length">
      <!-- GRID -->
      <div
        v-if="viewMode === 'grid'"
        id="events-list"
        class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <ManageItem
          v-for="item in searchedEvents"
          :key="item.id"
          view="grid"
          :to="toEvent(item.id)"
          :title="item.title"
          :date="item.date"
          :image="firstImage(item)"
          :summary="item.description"
          :published="item.published === true"
          :badge="normalizedType(item)"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>

          <!-- Optional footer button (whole card already clickable) -->
          <template #footer>
            <UiButton
              variant="outline"
              class="btn-readmore"
              type="button"
              @click.stop="readMore(item.id)"
            >
              Read more...
            </UiButton>
          </template>
        </ManageItem>
      </div>

      <!-- LIST -->
      <ul v-else id="events-list" class="divide-y rounded-xl border bg-white">
        <ManageItem
          v-for="item in searchedEvents"
          :key="item.id"
          view="list"
          :to="toEvent(item.id)"
          :title="item.title"
          :date="item.date"
          :image="firstImage(item)"
          :summary="item.description"
          :published="item.published === true"
          :badge="normalizedType(item)"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>
        </ManageItem>
      </ul>
    </template>

    <!-- ================= NO MATCHES (search active, data exists) ================= -->
    <div v-else-if="filteredEvents.length" class="mt-10 rounded border p-10 text-center text-gray-500">
      No matches for your search.
    </div>

    <!-- ================= EMPTY (no data at all) ================= -->
    <div v-else class="mt-10 rounded border p-10 text-center text-gray-500">
      No events yet. Click “+ Add Event” to create your first one.
    </div>

    <!-- Delete Modal -->
    <UiModal v-if="showDeleteModal" @close="showDeleteModal = false">
      <template #header>Delete Event</template>
      <template #default>
        Are you sure you want to delete
        <span class="font-semibold text-maroon">{{ selectedEvent?.title }}</span>?
      </template>
      <template #footer>
        <UiButton class="bg-gray-200" @click="showDeleteModal = false">Cancel</UiButton>
        <UiButton class="bg-red-600 text-white" @click="deleteEvent">Delete</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { collection, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { X } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useFirestore } from "vuefire";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import ManageItemSkeleton from '@/components/ManageItemSkeleton.vue'
import ManageSearchBar from '@/components/ManageSearchBar.vue' // <- you said you placed it here
import { useSearch, buildKeyMatcher } from '@/composables/useSearch'

definePageMeta({
    middleware: ['auth'],
     roles: ['faculty'],
    layout: "faculty",
});

const db = useFirestore();
const router = useRouter();

const events = ref<any[]>([]);
const selectedEvent = ref<any>(null);
const showDeleteModal = ref(false);

/** Loading flag for skeletons */
const isLoading = ref(true);

/** Filters */
const selectedYear = ref<string>("all");
const selectedType = ref<string>("all");
const selectedStatus = ref<"all" | "published" | "draft">("all");

/** View mode */
type ViewMode = "grid" | "list";
const viewMode = ref<ViewMode>("grid");

/** Search (shared UI + generic engine) */
const searchQuery = ref('');
// match across title, description, eventType, tags
const eventMatcher = buildKeyMatcher<any>(['title', 'description', 'eventType', 'tags']);

/** Available years for YearFilter */
const availableYears = computed(() => {
  const years = new Set<number>();
  events.value.forEach((item) => {
    const d = item?.date ? new Date(item.date) : null;
    if (d && !Number.isNaN(d.getTime())) years.add(d.getFullYear());
  });
  return Array.from(years).sort((a, b) => b - a);
});

onMounted(async () => {
  try {
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    events.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      id: d.id,
      ...d.data(),
    }));
  } finally {
    isLoading.value = false; // hide skeletons when fetch completes
  }
});

/** Helpers */
function normalizeType(v: any) {
  if (!v && v !== 0) return "";
  return String(v)
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
const normalizedType = (item: any) => {
  const t = normalizeType(item?.eventType);
  if (!t || t === "all") return "";
  return t
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
};

const toEvent = (id: string) => `/admin/super-admin/events/${id}`;
const firstImage = (it: any) => (it?.coverImages?.length ? it.coverImages[0] : null);

/** Filtering pipeline: type -> year -> status */
const listByType = computed(() =>
  selectedType.value === "all"
    ? events.value
    : events.value.filter((e) => normalizeType(e.eventType) === selectedType.value)
);

const filteredEvents = computed(() => {
  return listByType.value.filter((it) => {
    const yearOk =
      selectedYear.value === "all"
        ? true
        : (() => {
            const d = it?.date ? new Date(it.date) : null;
            return (
              d && !Number.isNaN(d.getTime()) && d.getFullYear() === Number(selectedYear.value)
            );
          })();

    const status = it.published === true ? "published" : "draft";
    const statusOk = selectedStatus.value === "all" || selectedStatus.value === status;

    return yearOk && statusOk;
  });
});

/** Search on top of filters */
const searchedEvents = useSearch(computed(() => filteredEvents.value), searchQuery, eventMatcher);

/** Actions */
function readMore(id: string) { router.push(toEvent(id)); }
function confirmDelete(item: any) { selectedEvent.value = item; showDeleteModal.value = true; }
async function deleteEvent() {
  if (!selectedEvent.value) return;
  await deleteDoc(doc(db, "events", selectedEvent.value.id));
  events.value = events.value.filter((e) => e.id !== selectedEvent.value.id);
  selectedEvent.value = null;
  showDeleteModal.value = false;
}

/** UX: scroll to list on change (search excluded to avoid jump while typing) */
watch([selectedYear, selectedType, selectedStatus, viewMode], () => {
  document.getElementById("events-list")?.scrollIntoView({ behavior: "smooth" });
});
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }

/* Ensure white text on hover for outline buttons */
:deep(.btn-readmore) {
  border-color: #740505;
  color: #740505;
}
:deep(.btn-readmore:hover) {
  background-color: #740505;
  color: #ffffff !important;
}
</style>
