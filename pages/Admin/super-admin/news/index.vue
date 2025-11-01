<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Manage News</h1>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/news/add_news')"
      >
        + Add News
      </UiButton>
    </div>

    <!-- Filters + View toggle -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <!-- Status (component) -->
      <StatusFilter v-model="selectedStatus" />

      <!-- Year -->
      <div v-if="availableYears.length" class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700">Year:</label>
        <select v-model="selectedYear" class="select select-bordered h-9">
          <option value="">All</option>
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>

      <!-- View mode pill -->
      <div class="md:ml-auto">
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <!-- Content -->
    <template v-if="filteredNews.length">
      <!-- GRID -->
      <div
        v-if="viewMode === 'grid'"
        id="news-list"
        class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="item in filteredNews"
          :key="item.id"
          class="relative bg-white border rounded shadow hover:shadow-md transition p-4 space-y-2 pt-8"
        >
          <!-- ❌ Delete -->
          <button
            class="absolute -top-2 -right-2 z-10 bg-white/90 p-1 rounded-full text-gray-500 hover:text-red-600 shadow"
            @click="confirmDelete(item)"
            type="button"
          >
            <X class="w-4 h-4" />
          </button>

          <!-- Cover -->
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            class="w-full h-48 object-cover rounded"
            alt="Cover image"
          />

          <!-- Title -->
          <h2 class="text-xl font-bold text-maroon">{{ item.title }}</h2>

          <!-- Meta -->
          <div class="text-sm text-gray-500">
            <span>By {{ item.author || 'Unknown' }}</span> |
            <span>{{ formatDate(item.createdAt) }}</span>
          </div>

          <!-- Description -->
          <p class="text-sm text-gray-700 line-clamp-3">
            {{ item.description }}
          </p>

          <!-- Read more -->
          <UiButton
            variant="outline"
            class="border-maroon text-maroon hover:bg-maroon hover:!text-white"
            @click="readMore(item.id)"
            type="button"
          >
            Read more...
          </UiButton>
        </div>
      </div>

      <!-- LIST -->
      <div v-else id="news-list" class="overflow-hidden rounded-xl border bg-white">
        <ul class="divide-y">
          <li
            v-for="item in filteredNews"
            :key="item.id"
            class="flex items-center gap-4 p-4"
          >
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              alt="Cover"
              class="h-16 w-24 flex-none rounded object-cover md:h-20 md:w-32"
            />
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-semibold text-gray-900">
                {{ item.title }}
              </h3>
              <div class="mt-0.5 text-xs text-gray-500">
                By {{ item.author || 'Unknown' }} • {{ formatDate(item.createdAt) }}
              </div>
              <p class="mt-2 line-clamp-2 text-sm text-gray-700">
                {{ item.description }}
              </p>
            </div>

            <div class="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <UiButton
                variant="outline"
                class="border-maroon text-maroon hover:bg-maroon hover:!text-white"
                @click="readMore(item.id)"
                type="button"
              >
                Read more
              </UiButton>
              <button
                class="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                @click="confirmDelete(item)"
                type="button"
                aria-label="Delete news"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </li>
        </ul>
      </div>
    </template>

    <!-- Empty -->
    <div v-else class="text-center text-gray-500 mt-10 border rounded p-10">
      No news items yet. Click “+ Add News” to create your first post.
    </div>

    <!-- 🧾 Delete Confirmation Modal -->
    <UiModal v-if="showDeleteModal" @close="showDeleteModal = false">
      <template #header>Delete News</template>

      <template #default>
        Are you sure you want to delete
        <span class="font-semibold text-maroon">{{ selectedNews?.title }}</span>?
      </template>

      <template #footer>
        <UiButton class="bg-gray-200" @click="showDeleteModal = false">Cancel</UiButton>
        <UiButton class="bg-red-600 text-white" @click="deleteNews">Delete</UiButton>
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
  collection, getDocs, doc, deleteDoc,
  Timestamp, QueryDocumentSnapshot, type DocumentData
} from 'firebase/firestore'
import { X } from 'lucide-vue-next'

import StatusFilter from '@/components/StatusFilter.vue'
import ViewModeToggle from '@/components/ViewModeToggle.vue'

const db = useFirestore()
const router = useRouter()
const news = ref<any[]>([])
const selectedNews = ref<any>(null)
const showDeleteModal = ref(false)

/** Filters */
const selectedStatus = ref<'all' | 'published' | 'draft'>('all')
const selectedYear = ref<string>('')

/** View mode */
type ViewMode = 'grid' | 'list'
const viewMode = ref<ViewMode>('grid')

/** Available years (from createdAt) */
const availableYears = computed(() => {
  const years = new Set<number>()
  news.value.forEach((item) => {
    const d = item.createdAt?.toDate?.() as Date | undefined
    if (d) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
})

/** Load data */
onMounted(async () => {
  const snap = await getDocs(collection(db, 'news'))
  news.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...d.data(),
  }))
})

/** Filtering */
const filteredNews = computed(() => {
  return news.value.filter((item) => {
    const d = item.createdAt?.toDate?.() as Date | undefined
    const yearOk = !selectedYear.value || d?.getFullYear() === Number(selectedYear.value)
    const status = item.published === true ? 'published' : 'draft'
    const statusOk = selectedStatus.value === 'all' || selectedStatus.value === status
    return yearOk && statusOk
  })
})

/** Actions */
function readMore(id: string) {
  router.push(`/Admin/super-admin/news/${id}`)
}
function formatDate(ts: Timestamp | null) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
function confirmDelete(item: any) {
  selectedNews.value = item
  showDeleteModal.value = true
}
async function deleteNews() {
  if (!selectedNews.value) return
  await deleteDoc(doc(db, 'news', selectedNews.value.id))
  news.value = news.value.filter((n) => n.id !== selectedNews.value.id)
  selectedNews.value = null
  showDeleteModal.value = false
}

/** Small UX: scroll to list on changes */
watch([selectedStatus, selectedYear, viewMode], () => {
  document.getElementById('news-list')?.scrollIntoView({ behavior: 'smooth' })
})
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
</style>
