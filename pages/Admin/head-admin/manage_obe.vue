<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex flex-col">
        <span class="font-montserrat text-4xl font-bold text-red-900"> Manage OBE</span>
        <span class="font-montserrat text-xs">
          Manage OBE page content
        </span>
      </div>

    <!-- Shared media + content form (includes notice banner inside) -->
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
      @cover-change="handleImage"
      @toggle-edit="toggleEdit"
      @save="savePage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import AdminSectionMediaContent from '@/components/Admin/AdminSectionMediaContent.vue'

definePageMeta({
  middleware: ['auth'],
  roles: ['head_admin'],
  layout: 'head-admin',
})


const db = useFirestore()
const storage = useFirebaseStorage()

/** UI state */
const isEditing = ref(false)
const saving = ref(false)

/** Form model */
const form = ref({
  coverImageUrl: '',
  content: '',
  videoUrl: '',
})

/** Pending (unsaved) cover image */
const pendingCoverFile = ref<File | null>(null)
const pendingCoverPreview = ref<string | ''>('')

/** Baseline snapshot */
const baseline = ref({
  coverImageUrl: '',
  content: '',
  videoUrl: '',
})

/* Notice state */
type NoticeType = 'success' | 'error'
const notice = ref<{ type: NoticeType; title: string } | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null

function showNotice(n: { type: NoticeType; title: string }, ms = 3000) {
  notice.value = n
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    notice.value = null
  }, ms)
}

/** Load existing OBE page on mount */
onMounted(async () => {
  const snap = await getDoc(doc(db, 'obe_page', 'main'))
  if (snap.exists()) {
    const data = snap.data() as any
    form.value.coverImageUrl = data.coverImageUrl || ''
    form.value.content = data.content || ''
    form.value.videoUrl = data.videoUrl || ''
  }
  baseline.value = { ...form.value }
})

/** Dirty checker */
const isDirty = computed(
  () =>
    !!pendingCoverFile.value ||
    form.value.coverImageUrl !== baseline.value.coverImageUrl ||
    form.value.content !== baseline.value.content ||
    form.value.videoUrl !== baseline.value.videoUrl,
)

/** Pick cover image (from AdminSectionMediaContent cover-change event) */
function handleImage(e: Event) {
  const file = (e.target as HTMLInputElement)?.files?.[0]
  if (!file) return

  if (pendingCoverPreview.value) {
    URL.revokeObjectURL(pendingCoverPreview.value as string)
  }
  pendingCoverFile.value = file
  pendingCoverPreview.value = URL.createObjectURL(file)
}

/** TipTap image uploader (passed into shared component) */
async function handleEditorImageUpload(file: File) {
  const path = `editor_images/${Date.now()}-${file.name}`
  const fileRef = storageRef(storage, path)
  const snap = await uploadBytes(fileRef, file)
  return await getDownloadURL(snap.ref)
}

/** Save changes (called by shared component) */
async function savePage() {
  if (!isDirty.value || saving.value) return
  saving.value = true

  try {
    // upload cover if there is a pending file
    if (pendingCoverFile.value) {
      const path = `obe_page/cover.jpg`
      const fileRef = storageRef(storage, path)
      await uploadBytes(fileRef, pendingCoverFile.value)
      form.value.coverImageUrl = await getDownloadURL(fileRef)
    }

    const payload = {
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
      videoUrl: form.value.videoUrl || '',
    }

    await setDoc(doc(db, 'obe_page', 'main'), payload)

    if (pendingCoverPreview.value) {
      URL.revokeObjectURL(pendingCoverPreview.value as string)
    }
    pendingCoverFile.value = null
    pendingCoverPreview.value = ''

    baseline.value = { ...form.value }
    isEditing.value = false

    showNotice({ type: 'success', title: 'OBE Page updated successfully.' })
  } catch (err) {
    console.error('Error saving OBE page:', err)
    showNotice({
      type: 'error',
      title: 'Something went wrong while saving the OBE page.',
    })
  } finally {
    saving.value = false
  }
}

/** Toggle edit mode (shared component just emits, logic lives here) */
function toggleEdit() {
  if (isEditing.value) {
    // cancel -> revert to baseline
    form.value = { ...baseline.value }
    if (pendingCoverPreview.value) {
      URL.revokeObjectURL(pendingCoverPreview.value as string)
    }
    pendingCoverFile.value = null
    pendingCoverPreview.value = ''
    isEditing.value = false
  } else {
    isEditing.value = true
  }
}
</script>
