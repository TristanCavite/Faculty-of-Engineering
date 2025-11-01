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
    <div v-if="filteredDownloads.length">
      <!-- Grid -->
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in filteredDownloads"
          :key="item.id"
          class="relative space-y-2 rounded border bg-white p-4 pt-8 shadow transition hover:shadow-md"
        >
          <!-- delete -->
          <button
            class="absolute -right-2 -top-2 z-10 rounded-full bg-white/90 p-1 text-gray-500 shadow hover:text-red-600"
            @click="confirmDelete(item)"
            aria-label="Delete download"
            type="button"
          >
            <X class="h-4 w-4" />
          </button>

          <h2 class="text-xl font-bold text-maroon">{{ item.title }}</h2>

          <div class="text-sm text-gray-500">
            <span>By {{ item.author || 'Unknown' }}</span>
            <span class="px-1">|</span>
            <span>{{ formatDate(primaryDate(item)) }}</span>
            <span
              v-if="item.published !== true"
              class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
            >Draft</span>
          </div>

          <p class="text-sm text-gray-700">
            {{ previewText(item.content) }}
          </p>

          <UiButton
            variant="outline"
            class="border-maroon text-maroon hover:!border-maroon hover:bg-maroon hover:!text-white"
            @click="readMore(item.id)"
            type="button"
          >
            Read more...
          </UiButton>
        </div>
      </div>

      <!-- List (rows) -->
      <ul v-else class="divide-y rounded border bg-white">
        <li
          v-for="item in filteredDownloads"
          :key="item.id"
          class="flex items-center gap-4 p-4"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="truncate text-lg font-semibold text-maroon">{{ item.title }}</h3>
              <span
                v-if="item.published !== true"
                class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >Draft</span>
            </div>
            <p class="text-xs text-gray-500">
              By {{ item.author || 'Unknown' }} • {{ formatDate(primaryDate(item)) }}
            </p>
            <p class="mt-1 line-clamp-2 text-sm text-gray-700">
              {{ previewText(item.content) }}
            </p>
          </div>

          <!-- Actions (right side, same row): Read more … + X -->
          <div class="flex shrink-0 items-center gap-2">
            <UiButton
              size="sm"
              variant="outline"
              class="border-maroon text-maroon hover:!border-maroon hover:bg-maroon hover:!text-white"
              @click="readMore(item.id)"
              type="button"
            >
              Read more...
            </UiButton>
            <button
              class="rounded-full p-1 text-gray-500 hover:text-red-600"
              @click="confirmDelete(item)"
              aria-label="Delete download"
              type="button"
              title="Delete"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </li>
      </ul>
    </div>

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
  type Timestamp,
} from 'firebase/firestore'
import { X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import type { DocumentData } from 'firebase/firestore'

import YearFilter from '@/components/YearFilter.vue'
import StatusFilter from '@/components/StatusFilter.vue'
import ViewModeToggle from '@/components/ViewModeToggle.vue'

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
