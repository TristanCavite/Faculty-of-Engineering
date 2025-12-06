<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex flex-col">
      <span class="text-4xl font-bold text-red-900 font-montserrat">
        Department Page Management
      </span>
      <span class="text-xs font-montserrat">
        Manage the content displayed on your department's public page
      </span>
    </div>

    <!-- Notice -->
    <transition name="fade">
      <div v-if="notice" class="rounded border px-4 py-2 text-sm"
           :class="notice.type === 'success'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-red-300 bg-red-50 text-red-800'">
        {{ notice.title }}
      </div>
    </transition>

    <!-- Content editor + cover (shared component) -->
    <div v-if="loaded || loading" class="grid gap-6">
      <AdminSectionMediaContent
        :coverImageUrl="form.coverImageUrl"
        :pendingCoverPreview="pendingCoverPreview"
        v-model:content="form.content"
        v-model:videoUrl="form.videoUrl"
        :isEditing="isEditing"
        :isDirty="isDirty"
        :saving="saving"
        :showVideoField="true"
        :imageUploadHandler="handleEditorImageUpload"
        :notice="notice"
        @clear-notice="notice = null"
        @cover-change="handleCoverChange"
        @toggle-edit="toggleEdit"
        @save="saveSection"
      />
    </div>

    <div v-else class="text-sm text-gray-500">Loading…</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useFirestore, useFirebaseStorage, useCurrentUser } from 'vuefire'
import AdminSectionMediaContent from '@/components/Admin/AdminSectionMediaContent.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'head-admin',
})

const db = useFirestore()
const storage = useFirebaseStorage()
const user = useCurrentUser()

const departmentId = ref<string>('')
const loading = ref(true)
const loaded = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const notice = ref<{ type: 'success'|'error', title: string } | null>(null)

// Form model
const form = ref({
  coverImageUrl: '',
  content: '',
  videoUrl: '',
})

// baseline for dirty check (saved state)
const baseline = ref({
  coverImageUrl: '',
  content: '',
  videoUrl: '',
})

// Pending cover file + preview (local object URL)
const pendingCoverFile = ref<File | null>(null)
const pendingCoverPreview = ref<string>('')

/* ---------- Load department id (from current user) and department page doc ---------- */
onMounted(async () => {
  try {
    if (!user.value) {
      loading.value = false
      return
    }

    const userSnap = await getDoc(doc(db, 'users', user.value.uid))
    if (!userSnap.exists()) {
      loading.value = false
      return
    }

    departmentId.value = (userSnap.data() as any).departmentId || ''
    if (!departmentId.value) {
      loading.value = false
      return
    }

    // load department page doc
    const pageSnap = await getDoc(doc(db, 'department_pages', departmentId.value))
    if (pageSnap.exists()) {
      const data = pageSnap.data() as any
      form.value.coverImageUrl = data.coverImageUrl || ''
      form.value.content = data.content || ''
      form.value.videoUrl = data.videoUrl || ''
      baseline.value = {
        coverImageUrl: form.value.coverImageUrl,
        content: form.value.content,
        videoUrl: form.value.videoUrl,
      }
    } else {
      // defaults already set to empty
      baseline.value = { coverImageUrl: '', content: '', videoUrl: '' }
    }

    loaded.value = true
  } catch (err) {
    console.error('Failed to load department page', err)
    notice.value = { type: 'error', title: 'Failed to load department page.' }
  } finally {
    loading.value = false
  }
})

/* ---------- Editor image upload handler (Tiptap) ---------- */
async function handleEditorImageUpload(file: File) {
  // same pattern as other pages
  const path = `editor_images/${Date.now()}-${file.name}`
  const sref = storageRef(storage, path)
  const snap = await uploadBytes(sref, file)
  return await getDownloadURL(snap.ref)
}

/* ---------- Cover change handler (UiSingleImageUpload emits native input change event) ---------- */
function handleCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement)?.files?.[0]
  if (!file) return

  // revoke old preview if present
  if (pendingCoverPreview.value) {
    URL.revokeObjectURL(pendingCoverPreview.value)
  }

  pendingCoverFile.value = file
  pendingCoverPreview.value = URL.createObjectURL(file)
}

/* ---------- Dirty detection ---------- */
const isDirty = computed(() => {
  return !!pendingCoverFile.value ||
         form.value.content !== baseline.value.content ||
         form.value.videoUrl !== baseline.value.videoUrl ||
         form.value.coverImageUrl !== baseline.value.coverImageUrl
})

/* ---------- Toggle edit (Cancel / Edit) ---------- */
function toggleEdit() {
  if (isEditing.value) {
    // cancel -> revert to baseline and clear pending
    form.value.content = baseline.value.content
    form.value.videoUrl = baseline.value.videoUrl
    form.value.coverImageUrl = baseline.value.coverImageUrl
    if (pendingCoverPreview.value) {
      URL.revokeObjectURL(pendingCoverPreview.value)
      pendingCoverPreview.value = ''
    }
    pendingCoverFile.value = null
    isEditing.value = false
  } else {
    isEditing.value = true
  }
}

/* ---------- Save: upload pending cover (if any) then write to department_pages/{id} ---------- */
async function saveSection() {
  if (!departmentId.value) return
  if (!isDirty.value || saving.value) return

  saving.value = true
  try {
    // upload pending cover first
    if (pendingCoverFile.value) {
      const path = `departments/${departmentId.value}/cover_${Date.now()}-${pendingCoverFile.value.name}`
      const sref = storageRef(storage, path)
      const snap = await uploadBytes(sref, pendingCoverFile.value)
      const url = await getDownloadURL(snap.ref)
      form.value.coverImageUrl = url
    }

    // set doc (merge)
    await setDoc(doc(db, 'department_pages', departmentId.value), {
      coverImageUrl: form.value.coverImageUrl || '',
      content: form.value.content || '',
      videoUrl: form.value.videoUrl || '',
      updatedAt: serverTimestamp(),
    }, { merge: true })

    // update baseline + cleanup pending
    baseline.value = {
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
      videoUrl: form.value.videoUrl,
    }
    if (pendingCoverPreview.value) {
      URL.revokeObjectURL(pendingCoverPreview.value)
      pendingCoverPreview.value = ''
    }
    pendingCoverFile.value = null
    isEditing.value = false

    notice.value = { type: 'success', title: 'Department page updated.' }
  } catch (err) {
    console.error('Failed to save department page', err)
    notice.value = { type: 'error', title: 'Failed to save. Please try again.' }
  } finally {
    saving.value = false
    setTimeout(() => { notice.value = null }, 3000)
  }
}

/* cleanup objectURL on unmount */
onBeforeUnmount(() => {
  if (pendingCoverPreview.value) {
    URL.revokeObjectURL(pendingCoverPreview.value)
    pendingCoverPreview.value = ''
  }
})
</script>

<style scoped>
.bg-maroon { background-color: #740505; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* keep editor style consistent */
.ProseMirror { outline: none !important; }
.EditorContent {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  min-height: 300px;
  background-color: #ffffff;
}
</style>
