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

    <!-- Filters + View toggle -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <YearFilter v-model="selectedYear" :years="availableYears" />
      <EventFilter v-model="selectedType" />
      <StatusFilter v-model="selectedStatus" />

      <!-- View mode pill -->
      <div class="md:ml-auto">
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <!-- Content -->
    <template v-if="filteredEvents.length">
      <!-- GRID -->
      <div
        v-if="viewMode === 'grid'"
        id="events-list"
        class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="item in filteredEvents"
          :key="item.id"
          class="relative space-y-2 rounded border bg-white p-4 pt-8 shadow transition hover:shadow-md"
        >
          <!-- delete -->
          <button
            class="absolute -right-2 -top-2 z-10 rounded-full bg-white/90 p-1 text-gray-500 shadow hover:text-red-600"
            @click="confirmDelete(item)"
            type="button"
          >
            <X class="h-4 w-4" />
          </button>

          <img
            v-if="item.coverImages?.length"
            :src="item.coverImages[0]"
            alt="Cover image"
            class="h-48 w-full rounded object-cover"
          />

          <h2 class="text-xl font-bold text-maroon">
            {{ item.title }}
          </h2>

          <div class="text-sm text-gray-500">
            {{ formatDate(item.date) }}
          </div>

          <p class="line-clamp-3 text-sm text-gray-700">
            {{ item.description }}
          </p>

          <UiButton variant="outline" class="btn-readmore" @click="readMore(item.id)" type="button">
            Read more...
          </UiButton>
        </div>
      </div>

      <!-- LIST -->
      <div v-else id="events-list" class="overflow-hidden rounded-xl border bg-white">
        <ul class="divide-y">
          <li v-for="item in filteredEvents" :key="item.id" class="flex items-center gap-4 p-4">
            <img
              v-if="item.coverImages?.length"
              :src="item.coverImages[0]"
              alt="Cover"
              class="h-16 w-24 flex-none rounded object-cover md:h-20 md:w-32"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="truncate text-base font-semibold text-gray-900">
                  {{ item.title }}
                </h3>
                <span
                  v-if="normalizedType(item)"
                  class="rounded-full border px-2 py-0.5 text-xs text-gray-600"
                >
                  {{ normalizedType(item) }}
                </span>
              </div>
              <div class="mt-0.5 text-xs text-gray-500">
                {{ formatDate(item.date) }}
              </div>
              <p class="mt-2 line-clamp-2 text-sm text-gray-700">
                {{ item.description }}
              </p>
            </div>

            <div class="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <UiButton
                variant="outline"
                class="btn-readmore"
                @click="readMore(item.id)"
                type="button"
              >
                Read more...
              </UiButton>
              <button
                class="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                @click="confirmDelete(item)"
                type="button"
                aria-label="Delete event"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </li>
        </ul>
      </div>
    </template>

    <!-- Empty -->
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
import EventFilter from "@/components/EventFilter.vue";
import YearFilter from "@/components/YearFilter.vue";
import StatusFilter from "@/components/StatusFilter.vue";
import ViewModeToggle from "@/components/ViewModeToggle.vue";

import { collection, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { X } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useFirestore } from "vuefire";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

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

/** Filters */
const selectedYear = ref<string>("all");                 // YearFilter model
const selectedType = ref<string>("all");                 // EventFilter model
const selectedStatus = ref<"all" | "published" | "draft">("all"); // StatusFilter model

/** View mode */
type ViewMode = "grid" | "list";
const viewMode = ref<ViewMode>("grid");

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
  const q = query(collection(db, "events"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  events.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...d.data(),
  }));
});

/** Helpers */
function normalizeType(v: any) {
  if (!v && v !== 0) return "";
  return String(v).toLowerCase().trim().replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}
const normalizedType = (item: any) => {
  const t = normalizeType(item?.eventType);
  if (!t || t === "all") return "";
  return t.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
};

/** Filtering pipeline: type -> year -> status */
const listByType = computed(() =>
  selectedType.value === "all"
    ? events.value
    : events.value.filter((e) => normalizeType(e.eventType) === selectedType.value)
);

const filteredEvents = computed(() => {
  return listByType.value.filter((it) => {
    // year
    const yearOk =
      selectedYear.value === "all"
        ? true
        : (() => {
            const d = it?.date ? new Date(it.date) : null;
            return d && !Number.isNaN(d.getTime()) && d.getFullYear() === Number(selectedYear.value);
          })();

    // status (assumes boolean 'published' on doc; false/undefined => 'draft')
    const status = it.published === true ? "published" : "draft";
    const statusOk = selectedStatus.value === "all" || selectedStatus.value === status;

    return yearOk && statusOk;
  });
});

/** Actions */
function readMore(id: string) {
  router.push(`/admin/super-admin/events/${id}`);
}
function formatDate(isoDate: string) {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

/** UX: scroll to list on change */
watch([selectedYear, selectedType, selectedStatus, viewMode], () => {
  document.getElementById("events-list")?.scrollIntoView({ behavior: "smooth" });
});
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }

/* Guarantee white text on hover for outline Read more button */
:deep(.btn-readmore) { border-color: #740505; color: #740505; }
:deep(.btn-readmore:hover) { background-color: #740505; color: #ffffff !important; }
</style>
