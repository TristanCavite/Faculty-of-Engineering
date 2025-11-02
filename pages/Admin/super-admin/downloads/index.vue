<!-- pages/admin/super-admin/downloads/index.vue -->
<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage Downloads</h1>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/downloads/add_download')"
      >
        + Add Download
      </UiButton>
    </div>

    <!-- Filters + View mode -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap items-center gap-3">
        <YearFilter v-model="selectedYear" :years="availableYears" />
        <StatusFilter v-model="selectedStatus" />
      </div>
      <ViewModeToggle v-model="viewMode" />
    </div>

    <!-- List -->
    <template v-if="filteredDownloads.length">
      <!-- GRID -->
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManageItem
          v-for="item in filteredDownloads"
          :key="item.id"
          view="grid"
          :to="`/admin/super-admin/downloads/${item.id}`"
          :title="item.title"
          :date="formatDate(primaryDate(item))"
          :summary="composeSummary(item)"
          :published="item.published === true"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>

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
      <ul v-else class="rounded-xl border bg-white divide-y">
        <ManageItem
          v-for="item in filteredDownloads"
          :key="item.id"
          view="list"
          :to="`/admin/super-admin/downloads/${item.id}`"
          :title="item.title"
          :date="formatDate(primaryDate(item))"
          :summary="composeSummary(item)"
          :published="item.published === true"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>
          <!-- intentionally no #row-actions to hide 'Read more…' in list -->
        </ManageItem>
      </ul>
    </template>

    <!-- Empty -->
    <div v-else class="mt-10 rounded border p-10 text-center text-gray-500">
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
  roles: ['super_admin'],
  layout: 'super-admin',
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
import { X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import type { DocumentData } from 'firebase/firestore'

const db = useFirestore()
const router = useRouter()

/* state */
const downloads = ref<any[]>([])
const selectedDownload = ref<any>(null)
const showDeleteModal = ref(false)

/* filters */
const selectedYear = ref<string>('all')
const selectedStatus = ref<'all' | 'published' | 'draft'>('all')
const viewMode = ref<'grid' | 'list'>('grid')

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
  const qRef = query(collection(db, 'downloads'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(qRef)
  downloads.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...d.data(),
  }))
})

/* filters */
const listByStatus = computed(() => {
  if (selectedStatus.value === 'all') return downloads.value
  return downloads.value.filter((it) =>
    selectedStatus.value === 'published' ? it.published === true : it.published !== true
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

/* actions */
function readMore(id: string) {
  router.push(`/admin/super-admin/downloads/${id}`)
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
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
</style>
