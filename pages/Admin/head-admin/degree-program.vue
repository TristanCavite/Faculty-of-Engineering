<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex flex-col">
      <span class="text-4xl font-bold text-red-900 font-montserrat">
        Degree Program Management
      </span>
      <span class="text-xs font-montserrat">
        Manage the content displayed on your department's degree program pages
      </span>
    </div>

    <!-- Program selector -->
    <div>
      <label class="mb-1 block font-semibold">Select Degree Program</label>
      <select v-model="selectedProgramId" class="select select-bordered w-full">
        <option disabled value="">-- Choose degree program --</option>
        <option v-for="program in degreePrograms" :key="program.id" :value="program.id">
          {{ program.name }}
        </option>
      </select>
    </div>

    <!-- Form (reuses AdminSectionMediaContent) -->
    <div v-if="selectedProgramId" class="grid gap-6">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue'
import { doc, getDoc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { useFirestore, useFirebaseStorage, useCurrentUser } from 'vuefire'
import AdminSectionMediaContent from '@/components/Admin/AdminSectionMediaContent.vue'

definePageMeta({
  middleware: 'auth',
  roles: ['head_admin'], // adjust to your exact role string if different
  layout: 'head-admin',
})

const db = useFirestore()
const storage = useFirebaseStorage()
const user = useCurrentUser()

const departmentId = ref('')
const degreePrograms = ref<{ id: string; name: string }[]>([])
const selectedProgramId = ref('')

const isEditing = ref(false)
const saving = ref(false)
const notice = ref<{ type: 'success'|'error', title: string } | null>(null)

// form model
const form = ref({
  coverImageUrl: '',
  content: '',
  videoUrl: '',
})

// baseline for dirty detection
const baseline = ref({
  coverImageUrl: '',
  content: '',
  videoUrl: '',
})

// pending local cover file + preview (not uploaded yet)
const pendingCoverFile = ref<File | null>(null)
const pendingCoverPreview = ref<string>('')

/* ---------- Load department & programs ---------- */
onMounted(async () => {
  if (!user.value) return
  const uref = doc(db, 'users', user.value.uid)
  const usnap = await getDoc(uref)
  if (!usnap.exists()) return

  departmentId.value = (usnap.data() as any).departmentId || ''

  if (departmentId.value) {
    await loadDegreePrograms()
  }
})

async function loadDegreePrograms() {
  if (!departmentId.value) return
  const qsnap = await getDocs(collection(db, 'departments', departmentId.value, 'degreePrograms'))
  degreePrograms.value = qsnap.docs.map(d => ({
    id: d.id,
    name: (d.data() as any).name || 'Unnamed Program',
  }))
}

/* ---------- When selected program changes: load its doc ---------- */
watch(selectedProgramId, async (programId) => {
  // clear pending preview on change
  if (pendingCoverPreview.value) {
    URL.revokeObjectURL(pendingCoverPreview.value)
    pendingCoverPreview.value = ''
  }
  pendingCoverFile.value = null

  if (!programId || !departmentId.value) {
    form.value.coverImageUrl = ''
    form.value.content = ''
    form.value.videoUrl = ''
    baseline.value = { coverImageUrl: '', content: '', videoUrl: '' }
    isEditing.value = false
    return
  }

  const snap = await getDoc(doc(db, 'departments', departmentId.value, 'degreePrograms', programId))
  if (snap.exists()) {
    const data = snap.data() as any
    form.value.coverImageUrl = data.coverImageUrl || ''
    form.value.content = data.content || ''
    form.value.videoUrl = data.videoUrl || ''
    baseline.value = {
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
      videoUrl: form.value.videoUrl,
    }
  } else {
    form.value.coverImageUrl = ''
    form.value.content = ''
    form.value.videoUrl = ''
    baseline.value = { coverImageUrl: '', content: '', videoUrl: '' }
  }
  isEditing.value = false
})

/* ---------- Editor image upload handler (Tiptap) ---------- */
async function handleEditorImageUpload(file: File) {
  const path = `editor_images/${Date.now()}-${file.name}`
  const fileRef = storageRef(storage, path)
  const snap = await uploadBytes(fileRef, file)
  return await getDownloadURL(snap.ref)
}

/* ---------- Cover change (UiSingleImageUpload emits native change event) ---------- */
function handleCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement)?.files?.[0]
  if (!file) return
  // cleanup old preview URL
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

/* ---------- Toggle edit (cancel / enter edit) ---------- */
function toggleEdit() {
  if (isEditing.value) {
    // cancel -> revert to baseline and clear pending cover
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

/* ---------- Save: upload pending cover (if any) then write doc ---------- */
async function saveSection() {
  if (!departmentId.value || !selectedProgramId.value) return
  if (!isDirty.value || saving.value) return
  saving.value = true

  try {
    if (pendingCoverFile.value) {
      const path = `departments/${departmentId.value}/degreePrograms/${selectedProgramId.value}/cover_${Date.now()}-${pendingCoverFile.value.name}`
      const sref = storageRef(storage, path)
      const up = await uploadBytes(sref, pendingCoverFile.value)
      const url = await getDownloadURL(up.ref)
      form.value.coverImageUrl = url
    }

    const programRef = doc(db, 'departments', departmentId.value, 'degreePrograms', selectedProgramId.value)
    await setDoc(programRef, {
      coverImageUrl: form.value.coverImageUrl || '',
      content: form.value.content || '',
      videoUrl: form.value.videoUrl || '',
      updatedAt: serverTimestamp(),
    }, { merge: true })

    // update baseline + cleanup pending file
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

    notice.value = { type: 'success', title: 'Program page updated.' }
  } catch (err) {
    console.error('Failed to save program page', err)
    notice.value = { type: 'error', title: 'Failed to save. Try again.' }
  } finally {
    saving.value = false
    setTimeout(() => { notice.value = null }, 3000)
  }
}

/* cleanup on unmount */
onBeforeUnmount(() => {
  if (pendingCoverPreview.value) {
    URL.revokeObjectURL(pendingCoverPreview.value)
    pendingCoverPreview.value = ''
  }
})
</script>

<style scoped>
.bg-maroon { background-color: #740505; }
.ProseMirror { outline: none !important; }
.EditorContent {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  min-height: 300px;
  background-color: #ffffff;
}
</style>
