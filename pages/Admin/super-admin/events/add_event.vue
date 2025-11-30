<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <!-- Header + Actions -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-maroon">
        {{ isEditMode ? 'Edit Event' : 'Add New Event' }}
      </h1>

      <div class="flex items-center gap-3">
        <UiButton
          type="button"
          class="btn-outline-maroon"
          @click="router.push('/admin/super-admin/events')"
        >
          Close
        </UiButton>

        <UiButton
          type="button"
          class="btn-outline-maroon"
          :disabled="loading"
          @click="saveEvent(false)"
        >
          {{ loading && lastAction === 'save' ? 'Saving…' : 'Save' }}
        </UiButton>

        <UiButton
          type="button"
          class="bg-maroon text-white hover:opacity-90"
          :disabled="loading"
          @click="saveEvent(true)"
        >
          {{ loading && lastAction === 'publish' ? 'Publishing…' : 'Publish' }}
        </UiButton>
      </div>
    </div>

    <div v-if="isEditMode" class="mb-4 text-sm text-gray-500">
      You are editing an existing event.
    </div>

    <!-- Form (no implicit submit) -->
    <form
      @submit.prevent
      @keydown.enter.capture="preventEnterSubmit"
      class="space-y-6"
      novalidate
    >
      <!-- Title -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
        <input
          v-model="form.title"
          type="text"
          required
          class="input input-bordered w-full"
          placeholder="Enter event title"
        />
      </div>

      <!-- Dates -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
        <input v-model="form.date" type="date" required class="input input-bordered w-full" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
        <input v-model="form.dateEnd" type="date" class="input input-bordered w-full" />
        <p class="mt-1 text-xs text-gray-500">Leave blank if the event is only one day.</p>
      </div>

      <!-- Event Type -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Event Type / Audience</label>
        <select v-model="form.eventType" class="select select-bordered w-full">
          <option disabled value="">Select event type (for filtering)</option>
          <option v-for="t in EVENT_TYPES" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Used for the Events page filter (separate from the calendar).
        </p>
      </div>

      <!-- Description -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Short Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          required
          class="textarea textarea-bordered w-full"
          placeholder="Enter a brief description of the event"
        />
      </div>

      <!-- Cover Images -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Cover Images</label>
        <input type="file" accept="image/*" multiple @change="handleFileChange" />
        <div v-if="previewUrls.length" class="mt-2 flex gap-4 overflow-x-auto">
          <img
            v-for="(src, i) in previewUrls"
            :key="i"
            :src="src"
            class="h-40 rounded border object-cover"
          />
        </div>
      </div>

      <!-- Content -->
      <div @click.capture="blockSubmitsFromEditor">
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
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore, useStorage } from 'vuefire'

definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

const db = useFirestore()
const storage = useStorage()
const router = useRouter()
const route = useRoute()

const isEditMode = computed(() => !!route.query.id)

const EVENT_TYPES = [
  { value: 'university', label: 'University' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'students', label: 'Students' },
  { value: 'department', label: 'Department' },
  { value: 'general', label: 'General' },
] as const

type EventType = '' | 'university' | 'faculty' | 'students' | 'department' | 'general'
type Status = 'draft' | 'pending' | 'published'

const form = ref({
  title: '',
  date: '',
  dateEnd: '',
  description: '',
  content: '',
  coverImages: [] as string[],
  eventType: '' as EventType,
})

const imageFiles = ref<File[]>([])
const previewUrls = ref<string[]>([])
const loading = ref(false)
const lastAction = ref<'save' | 'publish' | null>(null)
const editorReady = ref(false)
const existingStatus = ref<Status>('draft')

function deriveStatus(data: any): Status {
  const raw = typeof data?.status === 'string' ? data.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') return raw as Status
  return data?.published === true ? 'published' : 'draft'
}

/** File input */
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return
  imageFiles.value = Array.from(files)
  previewUrls.value = imageFiles.value.map((f) => URL.createObjectURL(f))
}

/** Populate in edit mode */
onMounted(async () => {
  const id = route.query.id as string
  editorReady.value = true
  if (isEditMode.value && id) {
    const snap = await getDoc(doc(db, 'events', id))
    if (snap.exists()) {
      const data = snap.data() as any
      form.value = {
        title: data.title || '',
        date: data.date || '',
        dateEnd: data.dateEnd || '',
        description: data.description || '',
        content: data.content || '',
        coverImages: data.coverImages || [],
        eventType: (data.eventType as EventType) || '',
      }
      existingStatus.value = deriveStatus(data)
      previewUrls.value = form.value.coverImages
    }
  }
})

/** Save helper
 *  - super admin Publish => status 'published'
 *  - Save:
 *      - new event   => 'draft'
 *      - editing     => keep whatever status it had
 */
async function saveEvent(publish: boolean) {
  if (loading.value) return
  loading.value = true
  lastAction.value = publish ? 'publish' : 'save'

  try {
    const id = (route.query.id as string) || crypto.randomUUID()

    // Upload newly selected cover images
    let uploadedUrls: string[] = form.value.coverImages || []
    if (imageFiles.value.length) {
      uploadedUrls = []
      for (const [index, file] of imageFiles.value.entries()) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `events/${id}/cover_${index}.${ext}`
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, file)
        uploadedUrls.push(await getDownloadURL(fileRef))
      }
    }

    const status: Status = publish
      ? 'published'
      : isEditMode.value
        ? existingStatus.value
        : 'draft'

    const payload: any = {
      ...form.value,
      coverImages: uploadedUrls,
      status,
      published: status === 'published',
      publishedAt: status === 'published' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    }
    if (!isEditMode.value) payload.createdAt = serverTimestamp()

    await setDoc(doc(collection(db, 'events'), id), payload, { merge: true })
    router.push('/admin/super-admin/events')
  } catch (err) {
    console.error('Error saving event:', err)
    alert('Something went wrong. Please try again.')
  } finally {
    loading.value = false
  }
}

/** Guard: avoid Enter submitting the form when typing */
function preventEnterSubmit(e: KeyboardEvent) {
  const el = e.target as HTMLElement
  const isTextarea = el.tagName === 'TEXTAREA'
  const isCE = (el as any)?.isContentEditable === true
  if (!isTextarea && !isCE) e.preventDefault()
}

/** Keep editor toolbar buttons from submitting */
function blockSubmitsFromEditor(e: Event) {
  const btn = (e.target as HTMLElement)?.closest?.('button') as HTMLButtonElement | null
  if (!btn) return
  if (!btn.type || btn.type.toLowerCase() === 'submit') e.preventDefault()
}

/** Tiptap image upload hook */
const handleEditorImageUpload = async (file: File): Promise<string> => {
  const fileId = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `events/editor/${fileId}.${ext}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file)
  return await getDownloadURL(fileRef)
}
</script>

<style scoped>
.text-maroon { color: #740505; }
.bg-maroon { background-color: #740505; }

/* Outline style matching your UI buttons */
.btn-outline-maroon {
  background-color: #ffffff;
  border: 1px solid #740505;
  color: #740505;
  transition: background-color .15s, color .15s, border-color .15s;
}
.btn-outline-maroon:hover {
  background-color: #740505;
  color: #ffffff;
}
</style>
