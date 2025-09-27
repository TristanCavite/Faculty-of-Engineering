<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Manage Researches</h1>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/research/add_research')"
      >
        + Add Research
      </UiButton>
    </div>

    <!-- 🔽 Filter by Year -->
    <div v-if="availableYears.length" class="flex items-center gap-4">
      <label class="text-sm font-medium text-gray-700">Filter by Year:</label>
      <select v-model="selectedYear" class="select select-bordered h-9">
        <option value="">All</option>
        <option
          v-for="year in availableYears"
          :key="year"
          :value="year"
        >
          {{ year }}
        </option>
      </select>
    </div>

    <!-- Filtered Research List -->
    <div v-if="filteredResearches.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="item in filteredResearches"
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

        <!-- Department + Researchers -->
        <div class="text-sm text-gray-700">
          <div><span class="font-medium">Department:</span> {{ departmentName(item.departmentId) || '—' }}</div>
          <div><span class="font-medium">Researchers:</span> {{ item.researchers || '—' }}</div>
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
      No researches yet. Click “+ Add Research” to create your first one.
    </div>

    <!-- 🧾 Delete Confirmation Modal -->
    <UiModal v-if="showDeleteModal" @close="showDeleteModal = false">
      <template #header>Delete Research</template>

      <template #default>
        Are you sure you want to delete
        <span class="font-semibold text-maroon">{{ selectedResearch?.title }}</span>?
      </template>

      <template #footer>
        <UiButton class="bg-gray-200" @click="showDeleteModal = false">Cancel</UiButton>
        <UiButton class="bg-red-600 text-white" @click="deleteResearch">Delete</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })

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

const db = useFirestore()
const router = useRouter()
const researches = ref<any[]>([])

const selectedResearch = ref<any>(null)
const showDeleteModal = ref(false)

const selectedYear = ref('')

/* Department ID -> Name map */
const departmentNames = ref<Record<string, string>>({})

function departmentName(id?: string) {
  return (id && departmentNames.value[id]) || ''
}

const availableYears = computed(() => {
  const years = new Set<number>()
  researches.value.forEach((item) => {
    const year = item.date ? new Date(item.date).getFullYear() : null
    if (year !== null) years.add(year)
  })
  return Array.from(years).sort((a, b) => (b ?? 0) - (a ?? 0))
})

const filteredResearches = computed(() => {
  return researches.value.filter((item) => {
    const y = item.date ? new Date(item.date).getFullYear() : null
    return !selectedYear.value || y === parseInt(selectedYear.value)
  })
})

onMounted(async () => {
  // Fetch researches (mirror events: order by 'date' desc)
  const q = query(collection(db, 'researches'), orderBy('date', 'desc'))
  const [researchSnap, deptSnap] = await Promise.all([
    getDocs(q),
    getDocs(collection(db, 'departments')),
  ])

  researches.value = researchSnap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data()
  }))

  // Build department map
  const map: Record<string, string> = {}
  deptSnap.docs.forEach((d) => {
    const data: any = d.data()
    map[d.id] = data?.name ?? data?.departmentName ?? data?.title ?? 'Unnamed Department'
  })
  departmentNames.value = map
})

function readMore(id: string) {
  router.push(`/Admin/super-admin/research/${id}`)
}

function formatDate(isoDate: string) {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function confirmDelete(item: any) {
  selectedResearch.value = item
  showDeleteModal.value = true
}

async function deleteResearch() {
  if (!selectedResearch.value) return
  await deleteDoc(doc(db, 'researches', selectedResearch.value.id))
  researches.value = researches.value.filter((r) => r.id !== selectedResearch.value.id)
  selectedResearch.value = null
  showDeleteModal.value = false
}
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
</style>
