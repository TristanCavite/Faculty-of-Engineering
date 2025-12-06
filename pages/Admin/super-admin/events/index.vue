<!-- pages/admin/super-admin/events/index.vue -->
<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <div class="flex items-center justify-between">
      <span class="font-montserrat text-4xl font-bold text-red-900"> Manage Events</span>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/events/add_event')"
      >
        + Add Event
      </UiButton>
    </div>

    <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <YearFilter v-model="selectedYear" :years="availableYears" />
      <EventFilter v-model="selectedType" />
      <StatusFilter v-model="selectedStatus" />
      <div class="md:ml-auto flex items-center gap-3">
        <ManageSearchBar v-model:query="searchQuery" placeholder="Search events…" />
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <template v-if="isLoading">
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="grid" />
      </div>
      <ul v-else class="divide-y rounded-xl border bg-white">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="list" />
      </ul>
    </template>

    <template v-else-if="searchedEvents.length">
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
          :published="getStatus(item) === 'published'"
          :status="item.status"
          :badge="normalizedType(item)"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>

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
          :published="getStatus(item) === 'published'"
          :status="item.status"
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

    <div v-else-if="filteredEvents.length" class="mt-10 rounded border p-10 text-center text-gray-500">
      No matches for your search.
    </div>

    <div v-else class="mt-10 rounded border p-10 text-center text-gray-500">
      No events yet. Click “+ Add Event” to create your first one.
    </div>

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

import ManageItemSkeleton from "@/components/ManageItemSkeleton.vue";
import ManageSearchBar from "@/components/ManageSearchBar.vue";
import { useSearch, buildKeyMatcher } from "@/composables/useSearch";

definePageMeta({
  middleware: ["auth"],
  roles: ["super_admin"],
  layout: "super-admin",
});

const db = useFirestore();
const router = useRouter();

const events = ref<any[]>([]);
const selectedEvent = ref<any>(null);
const showDeleteModal = ref(false);
const isLoading = ref(true);

const selectedYear = ref<string>("all");
const selectedType = ref<string>("all");
const selectedStatus = ref<'all' | 'published' | 'draft' | 'pending'>('published')

type ViewMode = "grid" | "list";
const viewMode = ref<ViewMode>("grid");

const searchQuery = ref("");
const eventMatcher = buildKeyMatcher<any>(["title", "description", "eventType", "tags"]);

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
    isLoading.value = false;
  }
});

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

function getStatus(it: any): "published" | "pending" | "draft" {
  const raw = typeof it?.status === "string" ? it.status.toLowerCase() : "";
  if (raw === "published" || raw === "pending" || raw === "draft") {
    return raw as "published" | "pending" | "draft";
  }
  return it?.published === true ? "published" : "draft";
}

const listByType = computed(() =>
  selectedType.value === "all"
    ? events.value
    : events.value.filter((e) => normalizeType(e.eventType) === selectedType.value),
);

const filteredEvents = computed(() => {
  return listByType.value.filter((it) => {
    const yearOk =
      selectedYear.value === "all"
        ? true
        : (() => {
            const d = it?.date ? new Date(it.date) : null;
            return d && !Number.isNaN(d.getTime()) && d.getFullYear() === Number(selectedYear.value);
          })();

    const status = getStatus(it);
    const statusOk = selectedStatus.value === "all" || selectedStatus.value === status;

    return yearOk && statusOk;
  });
});

const searchedEvents = useSearch(computed(() => filteredEvents.value), searchQuery, eventMatcher);

function readMore(id: string) {
  router.push(toEvent(id));
}
function confirmDelete(item: any) {
  selectedEvent.value = item;
  showDeleteModal.value = true;
}
async function deleteEvent() {
  if (!selectedEvent.value) return;
  await deleteDoc(doc(db, "events", selectedEvent.value.id));
  events.value = events.value.filter((e) => e.id !== selectedEvent.value.id);
  selectedEvent.value = null;
  showDeleteModal.value = false;
}

watch([selectedYear, selectedType, selectedStatus, viewMode], () => {
  document.getElementById("events-list")?.scrollIntoView({ behavior: "smooth" });
});
</script>

<style scoped>
.bg-maroon {
  background-color: #740505;
}
.text-maroon {
  color: #740505;
}
.border-maroon {
  border-color: #740505;
}
:deep(.btn-readmore) {
  border-color: #740505;
  color: #740505;
}
:deep(.btn-readmore:hover) {
  background-color: #740505;
  color: #ffffff !important;
}
</style>
