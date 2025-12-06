<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <!-- Top actions -->
    <div class="flex items-center gap-2">
      <UiButton
        class="text-maroon bg-white border border-maroon hover:bg-maroon hover:text-white"
        @click="goBackToIndex"
      >
        ← Back to News
      </UiButton>

      <!-- If draft: show Edit -->
      <UiButton
        v-if="news && news.status === 'draft'"  
        class="border border-maroon text-maroon bg-white hover:bg-maroon hover:text-white"
        @click="editNews"
      >
        ✏️ Edit
      </UiButton>
    </div>

    <!-- Cover image -->
    <img
      v-if="news?.imageUrl"
      :src="news.imageUrl"
      class="w-full max-h-[420px] object-cover rounded"
    />

    <!-- Title -->
    <h1 class="text-3xl font-bold text-maroon">{{ news?.title }}</h1>

    <!-- Meta -->
    <div class="text-sm text-gray-500">
      <span>Written by {{ news?.author || 'Unknown' }}</span>
      <span class="mx-2 text-gray-300">•</span>
      <span>{{ formatDate(news?.createdAt) }}</span>
      <span
        v-if="news && news.status === 'draft'"
        class="ml-2 rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-800 border border-yellow-200"
      >Draft</span>
    </div>

    <!-- Summary -->
    <p class="text-lg text-gray-700">{{ news?.description }}</p>

    <!-- Content -->
    <article class="prose max-w-none" v-html="news?.content"></article>
  </div>
</template>

<script setup lang="ts">
 definePageMeta({
   middleware: ['auth'],
   roles: ['faculty'],
   layout: "faculty",
 })

import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()
const db = useFirestore()

const newsId = route.params.id as string
const news = ref<any>(null)
const working = ref(false)

function goBackToIndex() {
  router.push('/Admin/faculty/news')
}

onMounted(async () => {
  const snap = await getDoc(doc(db, 'news', newsId))
  if (!snap.exists()) return goBackToIndex()
  news.value = { id: newsId, ...snap.data() }
})

async function unpublish() {
  if (!news.value) return
  working.value = true
  try {
    await updateDoc(doc(db, 'news', newsId), {
      status: 'draft',  // Change status to draft (as faculty can't unpublish directly)
      updatedAt: serverTimestamp(),
    })
    // After unpublishing, send it back to the list (now visible under Drafts)
    router.push('/Admin/faculty/news')
  } finally {
    working.value = false
  }
}

function editNews() {
  router.push(`/Admin/faculty/news/add_news?id=${newsId}`)
}

function formatDate(ts: Timestamp | null) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
.text-maroon { color: #740505; }
.border-maroon { border-color: #740505; }
.bg-maroon { background-color: #740505; }
</style>
