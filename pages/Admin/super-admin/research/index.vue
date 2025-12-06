<!-- pages/admin/super-admin/research/index.vue -->
<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <span class="font-montserrat text-4xl font-bold text-red-900"> Manage Researches</span>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/research/add_research')"
      >
        + Add Research
      </UiButton>
    </div>

    <!-- Filters + Search + View -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <YearFilter v-model="selectedYear" :years="availableYears" />
      <StatusFilter v-model="selectedStatus" />
      <div class="md:ml-auto flex items-center gap-3">
        <ManageSearchBar v-model:query="searchQuery" placeholder="Search research…" />
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <!-- ============== SKELETONS WHILE LOADING ============== -->
    <template v-if="isLoading">
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="grid" />
      </div>
      <ul v-else id="research-list" class="rounded-xl border bg-white divide-y">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="list" />
      </ul>
    </template>

    <!-- ============== CONTENT (after search) ============== -->
    <template v-else-if="searchedResearches.length">
      <!-- GRID -->
      <div
        v-if="viewMode === 'grid'"
        id="research-list"
        class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <ManageItem
          v-for="item in searchedResearches"
          :key="item.id"
          view="grid"
          :to="`/admin/super-admin/research/${item.id}`"
          :title="item.title"
          :date="item.date"
          :image="(item.coverImages && item.coverImages[0]) || undefined"
          :summary="item.description || ''"
          :badge="departmentName(item.departmentId) || undefined"
          :published="item.published === true"
          :status="item.status"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>

          <!-- Footer button ONLY in GRID -->
          <template #footer>
            <UiButton
              variant="outline"
              class="border-maroon text-maroon hover:!border-maroon hover:bg-maroon hover:!text-white"
              type="button"
              @click.stop="readMore(item.id)"
            >
              Read more...
            </UiButton>
          </template>
        </ManageItem>
      </div>

      <!-- LIST (no Read more button; keep X visible) -->
      <ul v-else id="research-list" class="rounded-xl border bg-white divide-y">
        <ManageItem
          v-for="item in searchedResearches"
          :key="item.id"
          view="list"
          :to="`/admin/super-admin/research/${item.id}`"
          :title="item.title"
          :date="item.date"
          :image="(item.coverImages && item.coverImages[0]) || undefined"
          :summary="composeSummary(item)"
          :badge="departmentName(item.departmentId) || undefined"
          :published="item.published === true"
          :status="item.status"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>
        </ManageItem>
      </ul>
    </template>

    <!-- ============== NO MATCHES (search active, data exists) ============== -->
    <div
      v-else-if="filteredResearches.length"
      class="mt-10 rounded border p-10 text-center text-gray-500"
    >
      No matches for your search.
    </div>

    <!-- ============== EMPTY (no data at all) ============== -->
    <div class="mt-10 rounded border p-10 text-center text-gray-500" v-else>
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

import { ref, onMounted, computed, watch } from 'vue'
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
import ManageItemSkeleton from '@/components/ManageItemSkeleton.vue'
import ManageSearchBar from '@/components/ManageSearchBar.vue'
import { useSearch, buildKeyMatcher, normalize } from '@/composables/useSearch'

type Status = 'draft' | 'pending' | 'published'

const db = useFirestore()
const router = useRouter()

/* state */
const researches = ref<any[]>([])
const selectedResearch = ref<any>(null)
const showDeleteModal = ref(false)
const isLoading = ref(true)

/* filters */
const selectedYear = ref<string>('all')
const selectedStatus = ref<'all' | Status>('published')
const viewMode = ref<'grid' | 'list'>('grid')

/* department map */
const departmentNames = ref<Record<string, string>>({})
function departmentName(id?: string) {
  return (id && departmentNames.value[id]) || ''
}

/* helper: normalize status for each doc (handles old docs without status) */
function normalizeStatus(rawStatus: any, publishedFlag: any): Status {
  const raw = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') {
    return raw as Status
  }
  // fallback for legacy docs that only have "published" boolean
  return publishedFlag === true ? 'published' : 'draft'
}

/* search */
const searchQuery = ref('')
// match base fields on research docs
const baseMatcher = buildKeyMatcher<any>(['title', 'description', 'researchers'])
// include department name in the haystack
const researchMatcher = (item: any, q: string) => {
  const baseOk = baseMatcher(item, q)
  const deptHay = normalize(departmentName(item.departmentId))
  const tokens = q.split(' ').filter(Boolean)
  const deptOk = tokens.length ? tokens.every((t) => deptHay.includes(t)) : true
  return baseOk || deptOk
}

/* load */
onMounted(async () => {
  try {
    const qRef = query(collection(db, 'researches'), orderBy('date', 'desc'))
    const [researchSnap, deptSnap] = await Promise.all([
      getDocs(qRef),
      getDocs(collection(db, 'departments')),
    ])

    const rawResearches = researchSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      id: d.id,
      ...d.data(),
    }))

    // attach normalized status to each item
    researches.value = rawResearches.map((it: any) => ({
      ...it,
      status: normalizeStatus(it.status, it.published),
    }))

    const map: Record<string, string> = {}
    deptSnap.docs.forEach((d) => {
      const data: any = d.data()
      map[d.id] = data?.name ?? data?.departmentName ?? data?.title ?? 'Unnamed Department'
    })
    departmentNames.value = map
  } finally {
    isLoading.value = false
  }
})

/* years */
const availableYears = computed(() => {
  const years = new Set<number>()
  researches.value.forEach((item) => {
    const d = item?.date ? new Date(item.date) : null
    if (d && !Number.isNaN(d.getTime())) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
})

/* filters: status -> year */
const listByStatus = computed(() => {
  if (selectedStatus.value === 'all') return researches.value
  return researches.value.filter(
    (it) => (it.status as Status | undefined) === selectedStatus.value,
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

/* search on top of filters */
const searchedResearches = useSearch(
  computed(() => filteredResearches.value),
  searchQuery,
  researchMatcher,
)

/* helpers */
function composeSummary(it: any) {
  const dept = departmentName(it.departmentId)
  const res = it.researchers ? `Researchers: ${it.researchers}` : ''
  const desc = it.description || ''
  return [dept ? `Department: ${dept}` : '', res, desc].filter(Boolean).join(' • ')
}

/* actions */
function readMore(id: string) {
  router.push(`/admin/super-admin/research/${id}`)
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

/* UX: scroll to list on change (exclude search to avoid jump while typing) */
watch([selectedYear, selectedStatus, viewMode], () => {
  document.getElementById('research-list')?.scrollIntoView({ behavior: 'smooth' })
})
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
</style>
