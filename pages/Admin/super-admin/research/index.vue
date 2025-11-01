<!-- pages/admin/super-admin/research/index.vue -->
<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage Researches</h1>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/research/add_research')"
      >
        + Add Research
      </UiButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <YearFilter v-model="selectedYear" :years="availableYears" />
      <StatusFilter v-model="selectedStatus" />
      <div class="md:ml-auto">
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <!-- Research list -->
    <div
      v-if="filteredResearches.length"
      :class="viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'"
    >
      <div
        v-for="item in filteredResearches"
        :key="item.id"
        :class="cardClass"
      >
        <!-- delete -->
        <button
          class="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1 text-gray-500 shadow hover:text-red-600"
          @click="confirmDelete(item)"
          type="button"
        >
          <X class="h-4 w-4" />
        </button>

        <!-- image -->
        <img
          v-if="item.coverImages?.length"
          :src="item.coverImages[0]"
          alt="Cover image"
          :class="imageClass"
        />

        <!-- body -->
        <div :class="viewMode === 'grid' ? '' : 'min-w-0 flex-1'">
          <h2 class="truncate text-xl font-bold text-maroon">
            {{ item.title }}
          </h2>

          <div class="text-sm text-gray-500">{{ formatDate(item.date) }}</div>

          <div class="text-sm text-gray-700">
            <div>
              <span class="font-medium">Department:</span>
              {{ departmentName(item.departmentId) || '—' }}
            </div>
            <div>
              <span class="font-medium">Researchers:</span>
              {{ item.researchers || '—' }}
            </div>
          </div>

          <p v-if="viewMode === 'grid'" class="text-sm text-gray-700">
            {{ item.description }}
          </p>

          <UiButton
            variant="outline"
            class="border-maroon text-maroon hover:bg-maroon hover:text-white"
            @click="readMore(item.id)"
            type="button"
          >
            Read more...
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="mt-10 rounded border p-10 text-center text-gray-500">
      No researches yet. Click “+ Add Research” to create your first one.
    </div>

    <!-- Delete Modal -->
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
definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

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
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { X } from 'lucide-vue-next'

import YearFilter from '@/components/YearFilter.vue'
import StatusFilter from '@/components/StatusFilter.vue'
import ViewModeToggle from '@/components/ViewModeToggle.vue'

const db = useFirestore()
const router = useRouter()

const researches = ref<any[]>([])
const selectedResearch = ref<any>(null)
const showDeleteModal = ref(false)

/** Filters */
const selectedYear = ref<string>('all')
const selectedStatus = ref<'all' | 'published' | 'draft'>('all')
const viewMode = ref<'grid' | 'list'>('grid') // ← View mode

/** Department ID -> Name map */
const departmentNames = ref<Record<string, string>>({})
function departmentName(id?: string) {
  return (id && departmentNames.value[id]) || ''
}

/** Available years for YearFilter */
const availableYears = computed(() => {
  const years = new Set<number>()
  researches.value.forEach((item) => {
    const d = item?.date ? new Date(item.date) : null
    if (d && !Number.isNaN(d.getTime())) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
})

/** Load researches + departments */
onMounted(async () => {
  const qRef = query(collection(db, 'researches'), orderBy('date', 'desc'))
  const [researchSnap, deptSnap] = await Promise.all([
    getDocs(qRef),
    getDocs(collection(db, 'departments')),
  ])

  researches.value = researchSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...d.data(),
  }))

  const map: Record<string, string> = {}
  deptSnap.docs.forEach((d) => {
    const data: any = d.data()
    map[d.id] = data?.name ?? data?.departmentName ?? data?.title ?? 'Unnamed Department'
  })
  departmentNames.value = map
})

/** Filtering: first by status, then by year */
const listByStatus = computed(() => {
  if (selectedStatus.value === 'all') return researches.value
  return researches.value.filter((it) =>
    selectedStatus.value === 'published' ? it.published === true : it.published !== true
  )
})
const filteredResearches = computed(() => {
  if (selectedYear.value === 'all') return listByStatus.value
  const y = Number(selectedYear.value)
  return listByStatus.value.filter((it) => {
    const d = it?.date ? new Date(it.date) : null
    return d && !Number.isNaN(d.getTime()) && d.getFullYear() === y
  })
})

/** Classes that depend on view mode */
const cardClass = computed(() =>
  viewMode.value === 'grid'
    ? 'relative space-y-2 rounded border bg-white p-4 pt-8 shadow transition hover:shadow-md'
    : 'relative flex items-start gap-4 rounded border bg-white p-4 shadow'
)
const imageClass = computed(() =>
  viewMode.value === 'grid'
    ? 'h-48 w-full rounded object-cover'
    : 'h-24 w-32 flex-shrink-0 rounded object-cover'
)

/** Actions */
function readMore(id: string) {
  router.push(`/admin/super-admin/research/${id}`)
}
function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
