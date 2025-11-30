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

      <!-- If published: Unpublish -->
      <UiButton
        v-if="status === 'published'"
        class="bg-maroon text-white hover:opacity-90"
        :disabled="working"
        @click="unpublish"
      >
        {{ working ? 'Unpublishing…' : 'Unpublish' }}
      </UiButton>

      <!-- If pending: Publish -->
      <UiButton
        v-else-if="status === 'pending'"
        class="bg-maroon text-white hover:opacity-90"
        :disabled="working"
        @click="publish"
      >
        {{ working ? 'Publishing…' : 'Publish' }}
      </UiButton>

      <!-- Otherwise (draft): Edit -->
      <UiButton
        v-else-if="news"
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
    <div class="text-sm text-gray-500 flex flex-wrap items-center gap-2">
      <span>Written by {{ news?.author || 'Unknown' }}</span>
      <span class="mx-2 text-gray-300">•</span>
      <span>{{ formatDate(news?.createdAt) }}</span>

      <!-- Status pill -->
      <span
        v-if="status === 'draft'"
        class="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 border border-gray-200"
      >
        Draft
      </span>
      <span
        v-else-if="status === 'pending'"
        class="ml-2 rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-800 border border-yellow-200"
      >
        Pending
      </span>
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
  roles: ['super_admin'],
  layout: 'super-admin',
})

import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, onMounted, computed } from 'vue'

type Status = 'draft' | 'pending' | 'published'

const route = useRoute()
const router = useRouter()
const db = useFirestore()

const newsId = route.params.id as string
const news = ref<any>(null)
const working = ref(false)

function goBackToIndex() {
  router.push('/admin/super-admin/news')
}

onMounted(async () => {
  const snap = await getDoc(doc(db, 'news', newsId))
  if (!snap.exists()) return goBackToIndex()
  news.value = { id: newsId, ...snap.data() }
})

function getStatusFromNews(n: any): Status {
  if (!n) return 'draft'
  const raw = typeof n.status === 'string' ? n.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') {
    return raw as Status
  }
  // fallback for old docs that only use "published" boolean
  return n.published === true ? 'published' : 'draft'
}

const status = computed<Status>(() => getStatusFromNews(news.value))

async function unpublish() {
  if (!news.value || working.value) return
  working.value = true
  try {
    await updateDoc(doc(db, 'news', newsId), {
      status: 'draft',
      published: false,
      publishedAt: null,
      updatedAt: serverTimestamp(),
    })
    news.value.status = 'draft'
    news.value.published = false
    news.value.publishedAt = null
  } finally {
    working.value = false
  }
}

async function publish() {
  if (!news.value || working.value) return
  working.value = true
  try {
    await updateDoc(doc(db, 'news', newsId), {
      status: 'published',
      published: true,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    news.value.status = 'published'
    news.value.published = true
    // local display only; Firestore has Timestamp
    news.value.publishedAt = new Date().toISOString()
  } finally {
    working.value = false
  }
}

function editNews() {
  router.push(`/admin/super-admin/news/add_news?id=${newsId}`)
}

function formatDate(ts: Timestamp | null | undefined) {
  if (!ts || typeof ts.toDate !== 'function') return ''
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
