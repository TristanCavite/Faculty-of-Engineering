<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <!-- Header + Actions -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-maroon">
        {{ isEditMode ? 'Edit Research' : 'Add New Research' }}
      </h1>

      <div class="flex items-center gap-3">
        <UiButton
          type="button"
          class="btn-outline-maroon"
          @click="router.push('/admin/super-admin/research')"
        >
          Close
        </UiButton>

        <UiButton
          type="button"
          class="btn-outline-maroon"
          :disabled="loading"
          @click="saveResearch(false)"
        >
          {{ loading && lastAction === 'save' ? 'Saving…' : 'Save' }}
        </UiButton>

        <UiButton
          type="button"
          class="bg-maroon text-white hover:opacity-90"
          :disabled="loading"
          @click="saveResearch(true)"
        >
          {{ loading && lastAction === 'publish' ? 'Publishing…' : 'Publish' }}
        </UiButton>
      </div>
    </div>

    <div v-if="isEditMode" class="mb-4 text-sm text-gray-500">
      You are editing an existing research entry.
    </div>

    <!-- FORM -->
    <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
      <!-- Title -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
        <input
          v-model="form.title"
          type="text"
          required
          class="input input-bordered w-full"
          placeholder="Enter research title"
        />
      </div>

      <!-- Date -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Date</label>
        <input v-model="form.date" type="date" required class="input input-bordered w-full" />
      </div>

      <!-- Description -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Short Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          required
          class="textarea textarea-bordered w-full"
          placeholder="Enter a brief description of the research"
        />
      </div>

      <!-- Department -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Department</label>
        <select v-model="form.departmentId" required class="select select-bordered w-full">
          <option disabled value="">-- Select a department --</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select>
        <p v-if="!departments.length" class="mt-1 text-xs text-gray-500">Loading departments…</p>
      </div>

      <!-- Researchers / Members (plain text) -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Researchers / Members</label>
        <input
          v-model="form.researchers"
          type="text"
          class="input input-bordered w-full"
          placeholder="e.g., Tristan Cavite, et al."
        />
        <p class="mt-1 text-xs text-gray-500">This is a free-text field (not a list).</p>
      </div>

      <!-- Cover Images (same layout as faculty) -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Cover Images</label>
        <input type="file" accept="image/*" multiple @change="handleFileChange" />

        <div v-if="previewUrls.length" class="mt-2 flex gap-4 overflow-x-auto">
          <div
            v-for="(src, i) in previewUrls"
            :key="i"
            class="relative"
          >
            <img
              :src="src"
              class="h-40 rounded border object-cover"
            />
            <button
              type="button"
              class="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-red-600 shadow hover:bg-white"
              aria-label="Remove image"
              @click="removeImageAt(i)"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Tiptap Editor -->
      <div @click.capture="suppressButtonSubmit">
        <label class="mb-1 block text-sm font-medium text-gray-700">Content</label>
        <UiTiptapEditor
          v-if="editorReady"
          :modelValue="form.content"
          :editing="true"
          class="rounded border border-gray-300 bg-white"
          @update:modelValue="(val) => (form.content = val)"
          @imageUpload="handleEditorImageUpload"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore, useStorage } from 'vuefire'

definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

type Status = 'draft' | 'pending' | 'published'

const db = useFirestore()
const storage = useStorage()
const router = useRouter()
const route = useRoute()

const isEditMode = computed(() => !!route.query.id)

/* Departments */
type Department = { id: string; name: string }
const departments = ref<Department[]>([])
async function loadDepartments() {
  const snap = await getDocs(collection(db, 'departments'))
  departments.value = snap.docs
    .map((d) => {
      const data: any = d.data()
      const name = data?.name ?? data?.departmentName ?? data?.title ?? 'Unnamed Department'
      return { id: d.id, name }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* Form model */
const form = ref({
  title: '',
  date: '',
  description: '',
  content: '',
  coverImages: [] as string[],   // existing uploaded URLs
  departmentId: '',
  researchers: '',
})

/* Local state */
const imageFiles = ref<File[]>([])     // NEW files to upload (stacked)
const previewUrls = ref<string[]>([])  // existing URLs + local object URLs
const loading = ref(false)
const lastAction = ref<'save' | 'publish' | null>(null)
const editorReady = ref(false)

function refreshPreviews() {
  const localPreviews = imageFiles.value.map((f) => URL.createObjectURL(f))
  previewUrls.value = [...(form.value.coverImages || []), ...localPreviews]
}

/** Stack images instead of replacing previous ones (same as faculty) */
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return

  const newFiles = Array.from(files)
  imageFiles.value = [...imageFiles.value, ...newFiles]

  refreshPreviews()
  target.value = '' // allow re-selecting same file
}

/* Load existing research + departments */
onMounted(async () => {
  editorReady.value = true
  await loadDepartments()

  const id = route.query.id as string
  if (isEditMode.value && id) {
    const snap = await getDoc(doc(db, 'researches', id))
    if (snap.exists()) {
      const data: any = snap.data()
      form.value = {
        title: data.title || '',
        date: data.date || '',
        description: data.description || '',
        content: data.content || '',
        coverImages: data.coverImages || [],
        departmentId: data.departmentId || '',
        researchers: Array.isArray(data.researchers)
          ? data.researchers.join(', ')
          : (data.researchers || ''),
      }
    }
  }
  refreshPreviews()
})

/** Remove image at index (same logic as faculty) */
function removeImageAt(idx: number) {
  const existingCount = form.value.coverImages.length

  if (idx < existingCount) {
    // remove from existing Firestore URLs
    form.value.coverImages.splice(idx, 1)
  } else {
    // remove from newly-selected files
    const localIndex = idx - existingCount
    if (localIndex >= 0 && localIndex < imageFiles.value.length) {
      imageFiles.value.splice(localIndex, 1)
    }
  }

  refreshPreviews()
}

/** Save handler:
 *  - publish = true  -> status = 'published'
 *  - publish = false -> status = 'draft'
 */
async function saveResearch(publish: boolean) {
  if (!form.value.departmentId) {
    alert('Please select a department.')
    return
  }
  if (loading.value) return
  loading.value = true
  lastAction.value = publish ? 'publish' : 'save'

  try {
    const id = (route.query.id as string) || crypto.randomUUID()

    // Start with existing coverImages (already saved)
    let coverImages: string[] = [...(form.value.coverImages || [])]

    // Upload ONLY the newly selected files and stack them
    if (imageFiles.value.length) {
      const offset = coverImages.length
      for (const [index, file] of imageFiles.value.entries()) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `researches/${id}/cover_${offset + index}.${ext}`
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, file)
        coverImages.push(await getDownloadURL(fileRef))
      }
    }

    const status: Status = publish ? 'published' : 'draft'

    const payload: any = {
      ...form.value,
      coverImages,
      status,
      published: status === 'published',
      publishedAt: status === 'published' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    }
    if (!isEditMode.value) payload.createdAt = serverTimestamp()

    await setDoc(doc(collection(db, 'researches'), id), payload, { merge: true })

    // reset local new files + previews to what is stored
    form.value.coverImages = coverImages
    imageFiles.value = []
    refreshPreviews()

    router.push('/admin/super-admin/research')
  } catch (err) {
    console.error('Error saving research:', err)
    alert('Something went wrong. Please try again.')
  } finally {
    loading.value = false
  }
}

/** If user presses Enter inside a field, treat as Save (draft) */
async function handleSubmit() {
  await saveResearch(false)
}

/* Editor image upload */
const handleEditorImageUpload = async (file: File): Promise<string> => {
  const fileId = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `researches/editor/${fileId}.${ext}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file)
  return await getDownloadURL(fileRef)
}

/* Prevent editor toolbar buttons from accidentally submitting the form */
function suppressButtonSubmit(event: Event) {
  const el = event.target as HTMLElement
  const btn = el?.closest?.('button') as HTMLButtonElement | null
  if (!btn) return
  if (!btn.type || btn.type.toLowerCase() === 'submit') event.preventDefault()
}
</script>

<style scoped>
.text-maroon { color:#740505; }
.bg-maroon { background-color:#740505; }

/* Outline pill that flips to maroon with white text on hover */
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
