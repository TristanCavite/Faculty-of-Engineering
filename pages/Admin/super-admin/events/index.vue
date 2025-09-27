<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Manage Events</h1>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/events/add_event')"
      >
        + Add Event
      </UiButton>
    </div>

   <!-- 🔽 Filters: Year + Event Type -->
<div v-if="availableYears.length" class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
  <div class="flex items-center gap-4">
    <label class="text-sm font-medium text-gray-700">Filter by Year:</label>
    <select v-model="selectedYear" class="select select-bordered h-9">
      <option value="">All</option>
      <option v-for="year in availableYears" :key="year" :value="String(year)">{{ year }}</option>
    </select>
  </div>

  <div class="flex items-center gap-4">
    <label class="text-sm font-medium text-gray-700">Filter by Type:</label>
    <select v-model="selectedType" class="select select-bordered h-9">
      <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
  </div>
</div>


    <!-- Filtered Event List -->
    <div v-if="filteredEvents.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="item in filteredEvents"
        :key="item.id"
        class="relative pt-8 bg-white border rounded shadow hover:shadow-md transition p-4 space-y-2"
      >
        <!-- ❌ Delete Icon -->
        <button
          class="absolute -top-2 -right-2 z-10 bg-white/90 p-1 rounded-full text-gray-500 hover:text-red-600 shadow"
          @click="confirmDelete(item)"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- Cover image -->
        <img
          v-if="item.coverImages?.length"
          :src="item.coverImages[0]"
          alt="Cover image"
          class="w-full h-48 object-cover rounded"
        />

        <!-- Title -->
        <h2 class="text-xl font-bold text-maroon">{{ item.title }}</h2>

        <!-- Date -->
        <div class="text-sm text-gray-500">
          <span>{{ formatDate(item.date) }}</span>
        </div>

        <!-- Description -->
        <p class="text-sm text-gray-700">{{ item.description }}</p>

        <!-- Read more -->
        <UiButton
          variant="outline"
          class="text-maroon border-maroon hover:bg-maroon hover:text-white"
          @click="readMore(item.id)"
        >
          Read more...
        </UiButton>
      </div>
    </div>

    <!-- Placeholder -->
    <div v-else class="text-center text-gray-500 mt-10 border rounded p-10">
      No events yet. Click “+ Add Event” to create your first one.
    </div>

    <!-- 🧾 Delete Confirmation Modal -->
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
definePageMeta({ layout: 'super-admin', middleware: 'auth' })

import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { X } from 'lucide-vue-next'
import type { DocumentData } from 'firebase/firestore'
import { watch } from 'vue';
const db = useFirestore()
const router = useRouter()
const events = ref<any[]>([])
const selectedType = ref<'all' | 'university' | 'faculty' | 'students' | 'department' | 'general'>('all');
const selectedEvent = ref<any>(null)
const showDeleteModal = ref(false)
const selectedDate = ref<Date | null>(null);
const selectedYear = ref<string>('')
const availableYears = computed(() => {
  const years = new Set<number>()
  events.value.forEach((item) => {
    const year = item.date ? new Date(item.date).getFullYear() : null
    if (year !== null) years.add(year)
  })
  return Array.from(years).sort((a, b) => (b ?? 0) - (a ?? 0))
})

const TYPE_OPTIONS = [
  { value: 'all',        label: 'All' },
  { value: 'university', label: 'University' },
  { value: 'faculty',    label: 'Faculty' },
  { value: 'students',   label: 'Students' },
  { value: 'department', label: 'Department' },
  { value: 'general',    label: 'General' },
] as const;


const filteredEvents = computed(() => {
  return events.value.filter((item) => {
    // year filter (same as before)
    const eventYear = item.date ? new Date(item.date).getFullYear() : null;
    const yearOk = !selectedYear.value || eventYear === Number(selectedYear.value);

    // type filter (using normalizeType to be robust)
    const evTypeNorm = normalizeType(item.eventType);
    const typeOk = selectedType.value === 'all' || evTypeNorm === selectedType.value;

    return yearOk && typeOk;
  });
});

onMounted(async () => {
  const q = query(collection(db, 'events'), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  events.value = snap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data()
  }))
})

function readMore(id: string) {
  router.push(`/Admin/super-admin/events/${id}`)
}

function formatDate(isoDate: string) {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function normalizeType(v: any) {
  if (!v && v !== 0) return '';
  return String(v)
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')    // spaces/underscores -> hyphen
    .replace(/[^a-z0-9-]/g, ''); // strip stray chars
}

function confirmDelete(item: any) {
  selectedEvent.value = item
  showDeleteModal.value = true
}

async function deleteEvent() {
  if (!selectedEvent.value) return
  await deleteDoc(doc(db, 'events', selectedEvent.value.id))
  events.value = events.value.filter((e) => e.id !== selectedEvent.value.id)
  selectedEvent.value = null
  showDeleteModal.value = false
}

watch(selectedYear, () => {
  selectedDate.value = null;
  // scroll to top of list if desired
  document.getElementById('events-list')?.scrollIntoView({ behavior: 'smooth' });
});

watch(selectedType, () => {
  selectedDate.value = null;
  document.getElementById('events-list')?.scrollIntoView({ behavior: 'smooth' });
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
</style>
