<!-- pages/admin/super-admin/downloads/add_download.vue -->
<template>
  <AddContentLayout
    createTitle="Add Download"
    editTitle="Edit Download"
    :isEditMode="isEditMode"
    :saving="saving"
    :lastAction="lastAction"
    :notice="notice"
    :isValid="isValid"
    @close="goBack"
    @save="saveDownload(false)"
    @publish="saveDownload(true)"
    @clear-notice="notice = null"
  >
    <!-- Access guard -->
    <div
      v-if="!loadingRole && !isSuperAdmin"
      class="rounded border border-red-200 bg-red-50 p-4 text-red-700"
    >
      You don’t have access to this page. Super Admin only.
    </div>

    <!-- Form -->
    <form
      v-else
      class="space-y-6"
      @submit.prevent
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
  </AddContentLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

import AddContentLayout from '@/components/Admin/AddContentLayout.vue'
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

/* access */
const isSuperAdmin = ref(false)
const loadingRole = ref(true)

onMounted(async () => {
  if (!currentUser.value) return router.push('/login')
  try {
    const userRef = doc(db, 'users', currentUser.value.uid)
    const snap = await getDoc(userRef)
    const role = (snap.exists() && (snap.data() as any).role) || ''
    isSuperAdmin.value =
      String(role).toLowerCase().replace(/\s+/g, '_') === 'super_admin'
  } finally {
    loadingRole.value = false
  }
  if (isSuperAdmin.value && isEditMode.value) await loadForEdit()
})

/* notices */
type NoticeType = 'success' | 'error'
const notice = ref<{ type: NoticeType; title: string } | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null
function showNotice(n: { type: NoticeType; title: string }, ms = 3000) {
  notice.value = n
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (notice.value = null), ms)
}

/* form */
const initialState = { title: '', author: '', content: '' }
const form = reactive({ ...initialState })
const isValid = computed(
  () => !!form.title.trim() && !!form.author.trim()
)
const saving = ref(false)
const lastAction = ref<'save' | 'publish' | null>(null)

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

/** publish = true  -> status = 'published'
 *  publish = false -> status = 'draft'
 */
async function saveDownload(publish: boolean) {
  if (!isSuperAdmin.value || !isValid.value) return
  if (saving.value) return
  saving.value = true
  lastAction.value = publish ? 'publish' : 'save'

  const status: Status = publish ? 'published' : 'draft'
  const isPublished = status === 'published'

  try {
    if (isEditMode.value && editId.value) {
      await updateDoc(doc(db, 'downloads', editId.value), {
        title: form.title,
        author: form.author,
        content: form.content,
        status,
        published: isPublished,
        publishedAt: isPublished ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.value?.uid ?? null,
      })
      showNotice({
        type: 'success',
        title: isPublished ? 'Download published.' : 'Draft saved.',
      })
    } else {
      const ref = await addDoc(collection(db, 'downloads'), {
        title: form.title,
        author: form.author,
        content: form.content,
        status,
        published: isPublished,
        publishedAt: isPublished ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.value?.uid ?? null,
      })
      // After creating, move into edit mode
      await router.replace({
        path: '/admin/super-admin/downloads/add_download',
        query: { id: ref.id },
      })
      showNotice({
        type: 'success',
        title: isPublished ? 'Download published.' : 'Draft created.',
      })
    }
  } catch (e) {
    console.error(e)
    showNotice({ type: 'error', title: 'Failed to save. Please try again.' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/admin/super-admin/downloads')
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
.fade-enter-active,
.fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

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
