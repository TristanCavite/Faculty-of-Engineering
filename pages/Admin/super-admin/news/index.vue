<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <span class="font-montserrat text-4xl font-bold text-red-900"> Manage News</span>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/news/add_news')"
      >
        + Add News
      </UiButton>
    </div>

    <!-- Filters + Search + View toggle -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <YearFilter v-model="selectedYear" :years="availableYears" />
      <StatusFilter v-model="selectedStatus" />
      <div class="md:ml-auto flex items-center gap-3">
        <!-- Shared search bar (debounced v-model) -->
        <ManageSearchBar v-model:query="searchQuery" placeholder="Search news…" />
        <ViewModeToggle v-model="viewMode" />
      </div>
    </div>

    <!-- ============== SKELETONS WHILE LOADING ============== -->
    <template v-if="isLoading">
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="grid" />
      </div>
      <ul v-else class="rounded-xl border bg-white divide-y">
        <ManageItemSkeleton v-for="i in 6" :key="i" view="list" />
      </ul>
    </template>

    <!-- ============== CONTENT (after search) ============== -->
    <template v-else-if="searchedNews.length">
      <!-- GRID -->
      <div
        v-if="viewMode === 'grid'"
        id="news-list"
        class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <ManageItem
          v-for="item in searchedNews"
          :key="item.id"
          view="grid"
          :to="`/admin/super-admin/news/${item.id}`"
          :title="item.title"
          :date="item.createdAt"
          :image="item.imageUrl || null"
          :summary="item.description || ''"
          :published="getStatus(item) === 'published'"
          :status="item.status"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon><X class="h-4 w-4" /></template>

          <!-- Footer button only in GRID -->
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

      <!-- LIST -->
      <ul v-else id="news-list" class="rounded-xl border bg-white divide-y">
        <ManageItem
          v-for="item in searchedNews"
          :key="item.id"
          view="list"
          :to="`/admin/super-admin/news/${item.id}`"
          :title="item.title"
          :date="item.createdAt"
          :image="item.imageUrl || null"
          :summary="item.description || ''"
          :published="getStatus(item) === 'published'"
          :status="item.status"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon><X class="h-4 w-4" /></template>
        </ManageItem>
      </ul>
    </template>

    <!-- ============== NO MATCHES (search active, data exists) ============== -->
    <div
      v-else-if="filteredNews.length"
      class="mt-10 rounded border p-10 text-center text-gray-500"
    >
      No matches for your search.
    </div>

    <!-- ============== EMPTY (no data at all) ============== -->
    <div v-else class="mt-10 rounded border p-10 text-center text-gray-500">
      No news items yet. Click “+ Add News” to create your first post.
    </div>

    <!-- Delete Modal -->
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
  collection,
  getDocs,
  doc,
  deleteDoc,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { X } from 'lucide-vue-next'
import ManageItemSkeleton from '@/components/ManageItemSkeleton.vue'
import ManageSearchBar from '@/components/ManageSearchBar.vue'
import { useSearch, buildKeyMatcher } from '@/composables/useSearch'

const db = useFirestore()
const router = useRouter()

type Status = 'draft' | 'pending' | 'published'

/* data */
const news = ref<any[]>([])
const selectedNews = ref<any>(null)
const showDeleteModal = ref(false)
const isLoading = ref(true)

/* filters */
const selectedStatus = ref<'all' | 'published' | 'draft' | 'pending'>('published')
const selectedYear = ref<string>('all')

/* view */
type ViewMode = 'grid' | 'list'
const viewMode = ref<ViewMode>('grid')

/* search */
const searchQuery = ref('')

const newsMatcher = buildKeyMatcher<any>(['title', 'description', 'content'])

/* Helper: derive canonical status from document */
function getStatus(item: any): Status {
  const raw = typeof item.status === 'string' ? item.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') {
    return raw as Status
  }
  // Fallback for old docs that only had `published` boolean
  return item.published === true ? 'published' : 'draft'
}

/* load */
onMounted(async () => {
  try {
    const qRef = query(collection(db, 'news'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(qRef)
    news.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      id: d.id,
      ...d.data(),
    }))
  } finally {
    isLoading.value = false
  }
})

/* years for YearFilter (desc) */
const availableYears = computed(() => {
  const years = new Set<number>()
  news.value.forEach((item) => {
    const d = item?.createdAt?.toDate?.() as Date | undefined
    if (d) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
})

/* filtered list (status + year) */
const filteredNews = computed(() => {
  return news.value.filter((item) => {
    const d = item?.createdAt?.toDate?.() as Date | undefined
    const yearOk =
      selectedYear.value === 'all' ? true : d?.getFullYear() === Number(selectedYear.value)

    const status = getStatus(item)
    const statusOk =
      selectedStatus.value === 'all' || selectedStatus.value === status

    return yearOk && statusOk
  })
})

/* search on top of filters */
const searchedNews = useSearch(computed(() => filteredNews.value), searchQuery, newsMatcher)

/* actions */
function readMore(id: string) {
  router.push(`/admin/super-admin/news/${id}`)
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

/* UX: scroll to list on change (exclude search to avoid jump while typing) */
watch([selectedStatus, selectedYear, viewMode], () => {
  document.getElementById('news-list')?.scrollIntoView({ behavior: 'smooth' })
})
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
</style>
