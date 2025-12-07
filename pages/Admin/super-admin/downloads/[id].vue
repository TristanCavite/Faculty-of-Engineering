<!-- pages/admin/super-admin/downloads/[id].vue -->
<template>
  <div class="mx-auto max-w-6xl px-4 py-10">
    <!-- Top controls (upper-left) -->
    <div class="mb-6 flex items-center gap-3">
      <UiButton
       variant="outline"
            class="border-maroon text-maroon hover:!border-maroon hover:bg-maroon hover:!text-white"
        @click="goBack"
        type="button"
      >
        Back to Downloads
      </UiButton>

      <!-- If published => Unpublish, else Edit -->
      <UiButton
        v-if="item?.published === true"
        class="bg-maroon text-white hover:opacity-90"
        :disabled="saving"
        @click="unpublish"
        type="button"
      >
        {{ saving ? 'Unpublishing…' : 'Unpublish' }}
      </UiButton>

      <UiButton
        v-else
        variant="outline"
        class="border-maroon text-maroon hover:bg-maroon hover:text-white"
        @click="edit"
        type="button"
      >
        Edit
      </UiButton>
    </div>

    <!-- Guard -->
    <div
      v-if="!loadingRole && !isSuperAdmin"
      class="rounded border border-red-200 bg-red-50 p-4 text-red-700"
    >
      You don’t have access to this page. Super Admin only.
    </div>

    <!-- Content -->
    <div v-else-if="docReady" class="space-y-4">
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
  roles: ['super_admin'],
  layout: 'super-admin',
})

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUser, useFirestore } from 'vuefire'
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const db = useFirestore()
const currentUser = useCurrentUser()

/* ---------- access control ---------- */
const isSuperAdmin = ref(false)
const loadingRole = ref(true)

onMounted(async () => {
  if (!currentUser.value) return router.push('/login')
  try {
    const uref = doc(db, 'users', currentUser.value.uid)
    const snap = await getDoc(uref)
    const role = (snap.exists() && (snap.data() as any).role) || ''
    isSuperAdmin.value = String(role).toLowerCase().replace(/\s+/g, '_') === 'super_admin'
  } finally {
    loadingRole.value = false
  }
  if (isSuperAdmin.value) await fetchDoc()
})

/* ---------- load doc ---------- */
const item = ref<any>(null)
const saving = ref(false)
const docReady = computed(() => !!item.value)

async function fetchDoc() {
  const id = String(route.params.id)
  const dref = doc(db, 'downloads', id)
  const snap = await getDoc(dref)
  if (!snap.exists()) return router.replace('/admin/super-admin/downloads')
  item.value = { id, ...snap.data() }
}

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
  return real.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' })
}

/* ---------- actions ---------- */
function goBack() {
  router.push('/admin/super-admin/downloads')
}

function edit() {
  router.push({
    path: '/admin/super-admin/downloads/add_download',
    query: { id: String(route.params.id) },
  })
}

async function unpublish() {
  if (!item.value || saving.value) return
  saving.value = true
  try {
    await updateDoc(doc(db, 'downloads', String(route.params.id)), {
      published: false,
      publishedAt: null,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.value?.uid ?? null,
    })
    router.push('/admin/super-admin/downloads')
  } finally {
    saving.value = false
  }
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
