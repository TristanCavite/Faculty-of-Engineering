<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
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
      <YearFilter v-model="selectedYear" :years="availableYears" />
      <StatusFilter v-model="selectedStatus" />
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
        <ManageItem
          v-for="item in filteredNews"
          :key="item.id"
          view="grid"
          :to="`/admin/super-admin/news/${item.id}`"
          :title="item.title"
          :date="item.createdAt"
          :image="item.imageUrl || null"
          :summary="item.description || ''"
          :published="item.published === true"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>

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
      <!-- removed overflow-hidden so the X pill isn’t clipped -->
      <ul v-else id="news-list" class="rounded-xl border bg-white divide-y">
        <ManageItem
          v-for="item in filteredNews"
          :key="item.id"
          view="list"
          :to="`/admin/super-admin/news/${item.id}`"
          :title="item.title"
          :date="item.createdAt"
          :image="item.imageUrl || null"
          :summary="item.description || ''"
          :published="item.published === true"
          deletable
          @delete="confirmDelete(item)"
        >
          <template #delete-icon>
            <X class="h-4 w-4" />
          </template>

          <!-- No #row-actions => no Read more button in LIST -->
        </ManageItem>
      </ul>
    </template>

    <!-- Empty -->
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
import { collection, getDocs, doc, deleteDoc, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore'
import { X } from 'lucide-vue-next'

const db = useFirestore()
const router = useRouter()

/* data */
const news = ref<any[]>([])
const selectedNews = ref<any>(null)
const showDeleteModal = ref(false)

/* filters */
const selectedStatus = ref<'all' | 'published' | 'draft'>('all')
const selectedYear = ref<string>('all')

/* view */
type ViewMode = 'grid' | 'list'
const viewMode = ref<ViewMode>('grid')

/* load */
onMounted(async () => {
  const snap = await getDocs(collection(db, 'news'))
  news.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...d.data(),
  }))
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

/* filtered list */
const filteredNews = computed(() => {
  return news.value.filter((item) => {
    const d = item?.createdAt?.toDate?.() as Date | undefined
    const yearOk = selectedYear.value === 'all' ? true : d?.getFullYear() === Number(selectedYear.value)
    const status = item.published === true ? 'published' : 'draft'
    const statusOk = selectedStatus.value === 'all' || selectedStatus.value === status
    return yearOk && statusOk
  })
})

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

/* UX: scroll to list on change */
watch([selectedStatus, selectedYear, viewMode], () => {
  document.getElementById('news-list')?.scrollIntoView({ behavior: 'smooth' })
})
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
</style>
