<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <!-- Top bar: Back (left) + Edit (right) -->
    <div class="flex items-center justify-between">
      <!-- Back to list -->
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/downloads')"
      >
        ← Back to Downloads
      </UiButton>

      <!-- Edit current item -->
      <UiButton
        class="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        @click="$router.push({ path: '/admin/super-admin/downloads/add_download', query: { id: route.params.id as string } })"
      >
        Edit
      </UiButton>
    </div>

    <!-- Access control -->
    <div
      v-if="!loadingRole && !isSuperAdmin"
      class="rounded border border-red-200 bg-red-50 p-4 text-red-700"
    >
      You don’t have access to this page. Super Admin only.
    </div>

    <!-- Content -->
    <div v-else-if="docReady" class="space-y-4">
      <!-- Title -->
      <h1 class="text-3xl font-bold text-maroon">{{ item?.title }}</h1>

      <!-- Meta -->
      <p class="text-sm text-gray-600">
        By {{ item?.author || '—' }}
        <span class="text-gray-400">•</span>
        {{ formatDate(item?.createdAt) }}
      </p>

      <!-- Rich HTML (links open in new tab) -->
      <article class="prose max-w-none">
        <div v-html="externalizedLinks(item?.content)"></div>
      </article>
    </div>

    <!-- Loading / not found -->
    <div v-else class="rounded border bg-white p-8 text-center text-gray-500">
      Loading…
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'super-admin', middleware: 'auth' })

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUser, useFirestore } from 'vuefire'
import { doc, getDoc, Timestamp } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const db = useFirestore()
const currentUser = useCurrentUser()

// ---------- access control ----------
const isSuperAdmin = ref(false)
const loadingRole = ref(true)
onMounted(async () => {
  if (!currentUser.value) return router.push('/login')
  try {
    const userRef = doc(db, 'users', currentUser.value.uid)
    const snap = await getDoc(userRef)
    isSuperAdmin.value = snap.exists() && snap.data().role === 'Super Admin'
  } finally {
    loadingRole.value = false
  }
  if (isSuperAdmin.value) await fetchDoc()
})

// ---------- doc load ----------
const item = ref<any>(null)
const docReady = computed(() => !!item.value)
async function fetchDoc() {
  const id = String(route.params.id)
  const dref = doc(db, 'downloads', id)
  const snap = await getDoc(dref)
  if (!snap.exists()) return router.replace('/admin/super-admin/downloads')
  item.value = { id, ...snap.data() }
}

function formatDate(ts?: Timestamp) {
  try {
    if (!ts) return '—'
    return ts.toDate().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    })
  } catch {
    return '—'
  }
}

// Ensure stored HTML links open in a new tab + are safe-ish
function externalizedLinks(html = '') {
  return html.replaceAll('<a ', '<a target="_blank" rel="noopener" ')
}
</script>

<style scoped>
/* Make links obviously clickable inside v-html content */
:deep(.prose a) { cursor: pointer; text-decoration: underline; }
.bg-maroon { background-color: #740505; }
.text-maroon { color: #740505; }
</style>
