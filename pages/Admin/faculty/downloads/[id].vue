<!-- pages/admin/faculty/downloads/[id].vue -->
<template>
  <div class="mx-auto max-w-6xl px-4 py-10">
    <!-- Top controls (upper-left) -->
    <div class="mb-6 flex items-center gap-3">
      <UiButton
        variant="outline"
        class="border-maroon text-maroon hover:!border-maroon hover:bg-maroon hover:!text-white"
        type="button"
        @click="goBack"
      >
        Back to Downloads
      </UiButton>

      <!-- Edit is ONLY visible for drafts -->
      <UiButton
        v-if="status === 'draft'"
        variant="outline"
        type="button"
        class="border-maroon text-maroon hover:bg-maroon hover:text-white"
        @click="edit"
      >
        Edit
      </UiButton>
    </div>

    <!-- Content -->
    <div v-if="docReady" class="space-y-4">
      <h1 class="text-3xl font-bold text-maroon">{{ item?.title }}</h1>

      <p class="text-sm text-gray-600">
        By {{ item?.author || '—' }}
        <span class="text-gray-400">•</span>
        {{ formatDate(primaryDate(item)) }}
      </p>

      <article class="prose max-w-none">
        <div v-html="externalizedLinks(item?.content)"></div>
      </article>
    </div>

    <!-- Loading -->
    <div v-else class="rounded border bg-white p-8 text-center text-gray-500">
      Loading…
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  roles: ['faculty'],
  layout: 'faculty',
})

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUser, useFirestore } from 'vuefire'
import { doc, getDoc, Timestamp } from 'firebase/firestore'

type Status = 'draft' | 'pending' | 'published'

const route = useRoute()
const router = useRouter()
const db = useFirestore()
const currentUser = useCurrentUser()

/* ---------- load doc ---------- */
const item = ref<any>(null)
const docReady = computed(() => !!item.value)

async function fetchDoc() {
  const id = String(route.params.id)
  const dref = doc(db, 'downloads', id)
  const snap = await getDoc(dref)
  if (!snap.exists()) return router.replace('/admin/faculty/downloads')
  item.value = { id, ...snap.data() }
}

onMounted(async () => {
  if (!currentUser.value) return router.push('/login')
  await fetchDoc()
})

/* ---------- status helper ---------- */
function deriveStatus(it: any): Status {
  if (!it) return 'draft'
  const raw = typeof it.status === 'string' ? it.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') {
    return raw as Status
  }
  // fallback for old docs without status
  return it.published === true ? 'published' : 'draft'
}

const status = computed<Status>(() => deriveStatus(item.value))

/* ---------- computed helpers ---------- */
function asDate(v: any): Date | null {
  if (!v) return null
  if (typeof v?.toDate === 'function') return v.toDate() as Date
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
function primaryDate(it: any): Date | null {
  return asDate(it?.createdAt) || asDate(it?.publishedAt) || asDate(it?.updatedAt)
}
function formatDate(d?: Date | Timestamp | null) {
  const real = d && (d as Timestamp).toDate ? (d as Timestamp).toDate() : (d as Date)
  if (!real) return '—'
  return real.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  })
}

/* ---------- actions ---------- */
function goBack() {
  router.push('/admin/faculty/downloads')
}

function edit() {
  router.push({
    path: '/admin/faculty/downloads/add_download',
    query: { id: String(route.params.id) },
  })
}

/* make all links open in new tab inside rich HTML */
function externalizedLinks(html = '') {
  return html.replaceAll('<a ', '<a target="_blank" rel="noopener" ')
}
</script>

<style scoped>
.text-maroon { color: #740505; }
.bg-maroon   { background-color: #740505; }
.border-maroon { border-color: #740505; }
</style>
