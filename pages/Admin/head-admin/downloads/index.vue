<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <span class="font-montserrat text-4xl font-bold text-red-900"> Manage Downloads</span>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/head-admin/downloads/add_download')"
      >
        + Add Download
      </UiButton>
    </div>

    <!-- Filters + Search + View mode -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap items-center gap-3">
        <YearFilter v-model="selectedYear" :years="availableYears" />
        <StatusFilter v-model="selectedStatus" />
      </div>
      <div class="flex items-center gap-3">
        <ManageSearchBar v-model:query="searchQuery" placeholder="Search downloads…" />
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <!-- ============== SKELETONS WHILE LOADING ============== -->
    <template v-if="isLoading">
      <!-- Grid skeletons -->
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="grid" />
      </div>
      <!-- List skeletons -->
      <ul v-else class="rounded-xl border bg-white divide-y">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="list" />
      </ul>
    </template>

    <!-- ============== CONTENT (after search) ============== -->
    <template v-else-if="searchedDownloads.length">
      <!-- GRID -->
      <div
        v-if="viewMode === 'grid'"
        id="downloads-list"
        class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <ManageItem
          v-for="item in searchedDownloads"
          :key="item.id"
          view="grid"
          :to="`/admin/head-admin/downloads/${item.id}`"
          :title="item.title"
          :date="formatDate(primaryDate(item))"
          :summary="composeSummary(item)"
          :published="item.published === true"
          :status="getStatusFromDownload(item)"
          :deletable="false"
          @delete="confirmDelete(item)"
        >
          <template #delete-icon><X class="h-4 w-4" /></template>

          <!-- Footer button only in GRID (card already clickable) -->
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

      <!-- LIST (no Read more button; X stays visible) -->
      <ul v-else id="downloads-list" class="rounded-xl border bg-white divide-y">
        <ManageItem
          v-for="item in searchedDownloads"
          :key="item.id"
          view="list"
          :to="`/admin/head-admin/downloads/${item.id}`"
          :title="item.title"
          :date="formatDate(primaryDate(item))"
          :summary="composeSummary(item)"
          :published="item.published === true"
          :status="getStatusFromDownload(item)"
          :deletable="false"
          @delete="confirmDelete(item)"
        >
          <template #delete-icon><X class="h-4 w-4" /></template>
        </ManageItem>
      </ul>
    </template>

    <!-- ============== NO MATCHES (search active, data exists) ============== -->
    <div
      v-else-if="filteredDownloads.length"
      class="mt-10 rounded border p-10 text-center text-gray-500"
    >
      No matches for your search.
    </div>

    <!-- ============== EMPTY ============== -->
    <div class="mt-10 rounded border p-10 text-center text-gray-500" v-else>
      No downloads yet. Click “+ Add Download” to create your first entry.
    </div>

    <!-- Delete Modal -->
    <UiModal v-if="showDeleteModal" @close="showDeleteModal = false">
      <template #header>Delete Download</template>
      <template #default>
        Are you sure you want to delete
        <span class="font-semibold text-maroon">{{ selectedDownload?.title }}</span>?
      </template>
      <template #footer>
        <UiButton class="bg-gray-200" @click="showDeleteModal = false">Cancel</UiButton>
        <UiButton class="bg-red-600 text-white" @click="deleteDownload">Delete</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  roles: ['head_admin'],
  layout: 'head-admin',
})

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
import { X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'

import ManageItemSkeleton from '@/components/ManageItemSkeleton.vue'
import ManageSearchBar from '@/components/ManageSearchBar.vue'
import { useSearch, buildKeyMatcher } from '@/composables/useSearch'

type Status = 'draft' | 'pending' | 'published'

const db = useFirestore()
const router = useRouter()

/* state */
const downloads = ref<any[]>([])
const selectedDownload = ref<any>(null)
const showDeleteModal = ref(false)
/* loading flag for skeletons */
const isLoading = ref(true)

/* filters */
const selectedYear = ref<string>('all')
const selectedStatus = ref<'all' | 'published' | 'draft' | 'pending'>('published')
const viewMode = ref<'grid' | 'list'>('grid')

/* search */
const searchQuery = ref('')
// Search typical fields for downloads
const downloadMatcher = buildKeyMatcher<any>([
  'title',
  'author',
  'description',
  'content',
  'fileName',
  'tags',
])

/* utils */
function asDate(v: any): Date | null {
  if (!v) return null
  if (typeof v?.toDate === 'function') return v.toDate() as Date
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
function primaryDate(it: any): Date | null {
  return asDate(it.createdAt) || asDate(it.publishedAt) || asDate(it.updatedAt)
}
function formatDate(d: Date | null) {
  if (!d) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
function previewText(html = '') {
  let txt = html.replace(/<[^>]*>/g, ' ')
  txt = txt
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return txt.length > 220 ? txt.slice(0, 220) + '…' : txt
}
/* Compose the summary to keep author visible */
function composeSummary(it: any) {
  const by = `By ${it.author || 'Unknown'}`
  const prev = previewText(it.content || '')
  return `${by} — ${prev}`
}

/** Derive a normalized status from each document.
 *  - Prefer the explicit `status` field
 *  - Fallback to `published` boolean for old docs
 */
function getStatusFromDownload(it: any): Status {
  const raw = typeof it?.status === 'string' ? it.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') {
    return raw as Status
  }
  return it?.published === true ? 'published' : 'draft'
}

/* years (desc) */
const availableYears = computed(() => {
  const years = new Set<number>()
  downloads.value.forEach((it) => {
    const d = primaryDate(it)
    if (d) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
})

/* load */
onMounted(async () => {
  try {
    const qRef = query(collection(db, 'downloads'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(qRef)
    downloads.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      id: d.id,
      ...d.data(),
    }))
  } finally {
    isLoading.value = false // ALWAYS end loading to hide skeletons
  }
})

/* filters */
const listByStatus = computed(() => {
  if (selectedStatus.value === 'all') return downloads.value
  return downloads.value.filter(
    (it) => getStatusFromDownload(it) === selectedStatus.value
  )
})

const filteredDownloads = computed(() => {
  if (selectedYear.value === 'all') return listByStatus.value
  const y = Number(selectedYear.value)
  return listByStatus.value.filter((it) => {
    const d = primaryDate(it)
    return d && d.getFullYear() === y
  })
})

/* search on top of filters */
const searchedDownloads = useSearch(
  computed(() => filteredDownloads.value),
  searchQuery,
  downloadMatcher
)

/* actions */
function readMore(id: string) {
  router.push(`/admin/head-admin/downloads/${id}`)
}
function confirmDelete(item: any) {
  selectedDownload.value = item
  showDeleteModal.value = true
}
async function deleteDownload() {
  if (!selectedDownload.value) return
  await deleteDoc(doc(db, 'downloads', selectedDownload.value.id))
  downloads.value = downloads.value.filter((d) => d.id !== selectedDownload.value.id)
  selectedDownload.value = null
  showDeleteModal.value = false
}

/* UX: scroll to list on filter/view changes (avoid jumping while typing search) */
watch([selectedYear, selectedStatus, viewMode], () => {
  document.getElementById('downloads-list')?.scrollIntoView({ behavior: 'smooth' })
})
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
</style>
