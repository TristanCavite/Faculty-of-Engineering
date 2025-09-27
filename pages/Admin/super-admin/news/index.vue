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
    
<!-- 🔽 Filter by Status -->
<div class="flex items-center gap-4">
  <label class="text-sm font-medium text-gray-700">Filter by Status:</label>
  <select v-model="selectedStatus" class="select select-bordered h-9">
    <option value="">All</option>
    <option value="published">Published</option>
    <option value="draft">Draft</option>
  </select>
</div>



    <!-- 🔽 Filter by Year -->
    <div v-if="availableYears.length" class="flex items-center gap-4">
      <label class="text-sm font-medium text-gray-700">Filter by Year:</label>
      <select
        v-model="selectedYear"
        class="select select-bordered h-9"
      >
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

    <!-- News list -->
    <div v-if="filteredNews.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="item in filteredNews"
        :key="item.id"
        class="relative bg-white border rounded shadow hover:shadow-md transition p-4 space-y-2 pt-8"
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
          v-if="item.imageUrl"
          :src="item.imageUrl"
          class="w-full h-48 object-cover rounded"
        />

        <!-- Title -->
        <h2 class="text-xl font-bold text-maroon">{{ item.title }}</h2>

        <!-- Author & Date -->
        <div class="text-sm text-gray-500">
          <span>By {{ item.author || 'Unknown' }}</span> |
          <span>{{ formatDate(item.createdAt) }}</span>
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
definePageMeta({ layout: 'super-admin', middleware: "auth" })

import { doc, deleteDoc } from 'firebase/firestore'
import { X } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
const selectedStatus = ref('published') // default to show only published

const db = useFirestore()
const router = useRouter()
const news = ref<any[]>([])
const selectedNews = ref<any>(null)
const showDeleteModal = ref(false)

const selectedYear = ref('')
const availableYears = computed(() => {
  const years = new Set(
    news.value.map((item) => {
      const date = item.createdAt?.toDate?.()
      return date ? date.getFullYear() : null
    }).filter(Boolean)
  )
  return Array.from(years).sort((a, b) => b - a)
})

const filteredNews = computed(() => {
  return news.value.filter((item) => {
    const date = item.createdAt?.toDate?.()
    const matchesYear = !selectedYear.value || date?.getFullYear?.() === parseInt(selectedYear.value)
    const matchesStatus =
      selectedStatus.value === ''
        ? true
        : selectedStatus.value === 'published'
        ? item.published === true
        : item.published === false
    return matchesYear && matchesStatus
  })
})


onMounted(async () => {
  const snap = await getDocs(collection(db, 'news'))
  news.value = snap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data()
  }))
})

function readMore(id: string) {
  router.push(`/Admin/super-admin/news/${id}`)
}

function formatDate(ts: Timestamp | null) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
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
