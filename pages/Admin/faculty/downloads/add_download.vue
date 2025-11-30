<template>
  <div class="mx-auto max-w-6xl px-4 py-8 md:pt-10 space-y-6">
    <!-- Top bar -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-maroon">
        {{ isEditMode ? 'Edit Download' : 'Add Download' }}
      </h1>

      <div class="flex items-center gap-2">
        <!-- Close (back) -->
        <UiButton
          type="button"
          class="btn-outline-maroon"
          @click="goBack"
        >
          Close
        </UiButton>

        <!-- Save (draft) -->
        <UiButton
          type="button"
          class="btn-outline-maroon"
          :disabled="saving || !isValid"
          @click="saveDownload(false)"
        >
          {{ saving && lastAction==='save' ? 'Saving…' : 'Save' }}
        </UiButton>

        <!-- Publish (actually: set status = pending) -->
        <UiButton
          type="button"
          class="bg-maroon text-white hover:opacity-90"
          :disabled="saving || !isValid"
          @click="saveDownload(true)"
        >
          {{ saving && lastAction==='publish' ? 'Publishing…' : 'Publish' }}
        </UiButton>
      </div>
    </div>

    <!-- Notice -->
    <transition name="fade">
      <div
        v-if="notice"
        class="flex items-start gap-3 rounded border p-3"
        :class="notice.type === 'success'
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-red-200 bg-red-50 text-red-800'"
        role="status"
      >
        <span class="font-medium">{{ notice.title }}</span>
        <button class="ml-auto opacity-70 hover:opacity-100" @click="notice = null">✕</button>
      </div>
    </transition>

    <!-- Form (no more access guard) -->
    <form class="space-y-6" @submit.prevent>
      <div class="grid gap-4 md:grid-cols-2">
        <!-- Title -->
        <div>
          <label class="mb-1 block text-sm font-medium">
            Title <span class="text-red-600">*</span>
          </label>
          <input
            v-model.trim="form.title"
            type="text"
            placeholder="e.g. Student Forms & Policies"
            class="input input-bordered w-full"
            required
          />
        </div>

        <!-- Author -->
        <div>
          <label class="mb-1 block text-sm font-medium">
            Author <span class="text-red-600">*</span>
          </label>
          <input
            v-model.trim="form.author"
            type="text"
            placeholder="e.g. Office of the Dean"
            class="input input-bordered w-full"
            required
          />
        </div>
      </div>

      <!-- Content -->
      <div @click.capture="suppressButtonSubmit">
        <label class="mb-2 block text-sm font-medium">Content</label>
        <UiTiptapEditor
          v-model="form.content"
          :editing="true"
          class="min-h-[320px] rounded border border-gray-300 bg-white"
        />
        <p class="mt-1 text-xs text-gray-500">
          Tip: Use the 🔗 icon to insert direct-download links (Google Drive style:
          <code>uc?export=download&id=…</code>).
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  roles: ['faculty'],
  layout: 'faculty',
})

import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUser, useFirestore } from 'vuefire'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

type Status = 'draft' | 'pending' | 'published'

/* core */
const router = useRouter()
const route = useRoute()
const db = useFirestore()
const currentUser = useCurrentUser()

/* edit mode */
const editId = computed(() => (route.query.id ? String(route.query.id) : null))
const isEditMode = computed(() => !!editId.value)

/* existing status (for edits) */
const existingStatus = ref<Status>('draft')

/* notices */
type NoticeType = 'success' | 'error'
const notice = ref<{ type: NoticeType; title: string } | null>(null)
let hideTimer: any = null
function showNotice(n: { type: NoticeType; title: string }, ms = 3000) {
  notice.value = n
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (notice.value = null), ms)
}

/* form */
const initialState = { title: '', author: '', content: '' }
const form = reactive({ ...initialState })
const isValid = computed(() => !!form.title && !!form.author)
const saving = ref(false)
const lastAction = ref<'save' | 'publish' | null>(null)

/* Load for edit */
async function loadForEdit() {
  if (!editId.value) return
  const dref = doc(db, 'downloads', editId.value)
  const snap = await getDoc(dref)
  if (!snap.exists()) return router.replace('/admin/faculty/downloads')
  const data = snap.data() as any
  form.title = data.title ?? ''
  form.author = data.author ?? ''
  form.content = data.content ?? ''

  // derive status (handles old docs without status)
  const raw = typeof data.status === 'string' ? data.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') {
    existingStatus.value = raw as Status
  } else {
    existingStatus.value = data.published === true ? 'published' : 'draft'
  }
}

onMounted(async () => {
  if (!currentUser.value) return router.push('/login')
  if (isEditMode.value) await loadForEdit()
})

/** saveDownload:
 *  - Save  -> draft (new) or keep existing status (edit)
 *  - Publish -> pending (never directly published by faculty)
 *  - After success → go to /admin/faculty/downloads/[id]
 */
async function saveDownload(publish: boolean) {
  if (!isValid.value) return
  if (saving.value) return
  saving.value = true
  lastAction.value = publish ? 'publish' : 'save'

  // Status logic for faculty
  const status: Status = publish
    ? 'pending'
    : isEditMode.value
      ? existingStatus.value
      : 'draft'

  const commonPayload = {
    title: form.title,
    author: form.author,
    content: form.content,
    status,
    published: status === 'published',              // faculty never sets this true
    publishedAt: status === 'published' ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.value?.uid ?? null,
  }

  try {
    if (isEditMode.value && editId.value) {
      // UPDATE
      await updateDoc(doc(db, 'downloads', editId.value), commonPayload)
      showNotice({
        type: 'success',
        title: status === 'pending' ? 'Download submitted for approval.' : 'Draft saved.',
      })
      // 👉 Go to the show page
      router.push(`/admin/faculty/downloads/${editId.value}`)
    } else {
      // CREATE
      const ref = await addDoc(collection(db, 'downloads'), {
        ...commonPayload,
        createdAt: serverTimestamp(),
        createdBy: currentUser.value?.uid ?? null,
      })
      showNotice({
        type: 'success',
        title: status === 'pending' ? 'Download submitted for approval.' : 'Draft created.',
      })
      // 👉 Go to the show page of the new download
      router.push(`/admin/faculty/downloads/${ref.id}`)
    }
  } catch (e) {
    console.error(e)
    showNotice({ type: 'error', title: 'Failed to save. Please try again.' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/admin/faculty/downloads')
}

/* Prevent toolbar buttons from submitting form */
function suppressButtonSubmit(event: Event) {
  const el = event.target as HTMLElement
  const btn = el?.closest?.('button') as HTMLButtonElement | null
  if (!btn) return
  if (!btn.type || btn.type.toLowerCase() === 'submit') event.preventDefault()
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.text-maroon { color:#740505; }
.bg-maroon { background-color:#740505; }

/* outline pill identical to Research page */
.btn-outline-maroon {
  background-color: #ffffff;
  border: 1px solid #740505;
  color: #740505;
  transition: background-color .15s, color .15s, border-color .15s;
}
.btn-outline-maroon:hover {
  background-color: #740505;
  color: #ffffff !important;
}
</style>
