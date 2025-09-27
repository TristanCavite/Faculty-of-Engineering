<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- Top bar: Title (left) + Back / Save / Cancel (right) -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        {{ isEditMode ? 'Edit Download' : 'Add Download' }}
      </h1>

      <!-- Actions moved here -->
      <div class="flex items-center gap-2">
        <!-- Back -->
        <UiButton
          type="button"
          class="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          @click="goBack"
        >
          ← Back
        </UiButton>

        <!-- Save / Publish (submits the form below by id) -->
        <UiButton
          type="submit"
          :form="formId"
          class="bg-maroon text-white hover:opacity-90"
          :disabled="saving || !isValid"
        >
          {{ isEditMode ? 'Save Changes' : 'Publish' }}
        </UiButton>

        <!-- Cancel Edit / Reset -->
        <UiButton
          type="button"
          class="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          @click="resetForm"
        >
          {{ isEditMode ? 'Cancel Edit' : 'Reset' }}
        </UiButton>
      </div>
    </div>

    <!-- ✅ Confirmation / Error Banner -->
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

    <!-- Access control -->
    <div
      v-if="!loadingRole && !isSuperAdmin"
      class="rounded border border-red-200 bg-red-50 p-4 text-red-700"
    >
      You don’t have access to this page. Super Admin only.
    </div>

    <!-- Form -->
    <form
      v-else
      :id="formId"
      class="space-y-6"
      @submit.prevent="save"
    >
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

      <!-- Content (Tiptap) -->
      <div>
        <label class="mb-2 block text-sm font-medium">Content</label>
        <UiTiptapEditor v-model="form.content" :editing="true" class="min-h-[320px]" />
        <p class="mt-1 text-xs text-gray-500">
          Tip: Use the 🔗 icon to insert direct-download links (Drive: <code>uc?export=download&id=…</code>).
        </p>
      </div>
      <!-- (No bottom button row anymore — moved to top-right) -->
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'super-admin', middleware: 'auth' })

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

const router = useRouter()
const route = useRoute()
const db = useFirestore()
const currentUser = useCurrentUser()

// Form id so the top-right Save button can submit it
const formId = 'downloadForm'

// edit mode via ?id=DOC_ID
const editId = computed(() => (route.query.id ? String(route.query.id) : null))
const isEditMode = computed(() => !!editId.value)

// Access control
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
  if (isSuperAdmin.value && isEditMode.value) await loadForEdit()
})

// Notice banner
type NoticeType = 'success' | 'error'
const notice = ref<{ type: NoticeType; title: string } | null>(null)
let hideTimer: any = null
function showNotice(n: { type: NoticeType; title: string }, ms = 3200) {
  notice.value = n
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (notice.value = null), ms)
}

// Form state
const initialState = { title: '', author: '', content: '' }
const form = reactive({ ...initialState })
const isValid = computed(() => !!form.title && !!form.author)
const saving = ref(false)

async function loadForEdit() {
  if (!editId.value) return
  const dref = doc(db, 'downloads', editId.value)
  const snap = await getDoc(dref)
  if (!snap.exists()) return router.replace('/admin/super-admin/downloads')
  const data = snap.data() as any
  form.title = data.title ?? ''
  form.author = data.author ?? ''
  form.content = data.content ?? ''
}

async function save() {
  if (!isSuperAdmin.value || !isValid.value) return
  saving.value = true
  try {
    if (isEditMode.value && editId.value) {
      await updateDoc(doc(db, 'downloads', editId.value), {
        title: form.title,
        author: form.author,
        content: form.content,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.value?.uid ?? null,
      })
      showNotice({ type: 'success', title: 'Download updated successfully.' })
    } else {
      await addDoc(collection(db, 'downloads'), {
        title: form.title,
        author: form.author,
        content: form.content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.value?.uid ?? null,
      })
      Object.assign(form, { ...initialState })
      showNotice({ type: 'success', title: 'Download added successfully.' })
    }
  } catch (e) {
    showNotice({ type: 'error', title: 'Failed to save download.' })
  } finally {
    saving.value = false
  }
}

function resetForm() {
  if (isEditMode.value) loadForEdit()
  else Object.assign(form, { ...initialState })
}

function goBack() {
  router.push('/admin/super-admin/downloads')
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.bg-maroon { background-color: #740505; }
</style>
