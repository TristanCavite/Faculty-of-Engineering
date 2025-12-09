<!-- pages/admin/super-admin/events/add_event.vue (or similar path) -->
<template>
  <AddContentLayout
    createTitle="Add New Event"
    editTitle="Edit Event"
    :isEditMode="isEditMode"
    :saving="loading"
    :lastAction="lastAction"
    :notice="notice"
    :isValid="isValid"
    @close="goBack"
    @save="saveEvent(false)"
    @publish="saveEvent(true)"
    @clear-notice="notice = null"
  >
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

      <!-- Start Date -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
        <input
          v-model="form.date"
          type="date"
          required
          class="input input-bordered w-full"
        />
      </div>

      <!-- End Date -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
        <input v-model="form.dateEnd" type="date" class="input input-bordered w-full" />
        <p class="mt-1 text-xs text-gray-500">
          Leave blank if the event is only one day.
        </p>
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

      <!-- NEW: Drag & drop cover image uploader -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Cover Images</label>
        <CoverImageUploader
          v-model:existing="form.coverImages"
          v-model:newFiles="imageFiles"
          hint="You can upload multiple images; the first one will be used as the main cover."
        />
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
  </AddContentLayout>
</template>

<script setup lang="ts">
import AddContentLayout from '@/components/Admin/AddContentLayout.vue'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore, useStorage } from 'vuefire'
import CoverImageUploader from '@/components/Admin/CoverImageUploader.vue'

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

const initialForm = {
  title: '',
  date: '',
  dateEnd: '',
  description: '',
  content: '',
  coverImages: [] as string[],
  eventType: '' as EventType,
}

const form = ref({ ...initialForm })


const imageFiles = ref<File[]>([])
const previewUrls = ref<string[]>([])
const loading = ref(false)
const lastAction = ref<'save' | 'publish' | null>(null)
const editorReady = ref(false)
const existingStatus = ref<Status>('draft')

/* notice for AddContentLayout (you can keep it mostly for errors) */
type NoticeType = 'success' | 'error'
const notice = ref<{ type: NoticeType; title: string } | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null
function showNotice(n: { type: NoticeType; title: string }, ms = 3000) {
  notice.value = n
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (notice.value = null), ms)
}

/* Disable Save/Publish until required fields are filled */
const isValid = computed<boolean>(() => {
  const v = form.value
  return !!(
    v.title.trim() &&
    v.date &&
    v.eventType &&
    v.description.trim() &&
    v.content.trim()
  )
})


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
 *  - Super admin Publish => status 'published'
 *  - Save:
 *      - new event   => 'draft'
 *      - editing     => keep whatever status it had
 */
async function saveEvent(publish: boolean) {
  if (loading.value) return
  if (!isValid.value) return

  loading.value = true
  lastAction.value = publish ? 'publish' : 'save'

  try {
    const idFromRoute = route.query.id as string | undefined
    const id = idFromRoute || crypto.randomUUID()
    const isNew = !isEditMode.value

    // Upload newly selected cover images (if any)
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
    if (isNew) payload.createdAt = serverTimestamp()

    await setDoc(doc(collection(db, 'events'), id), payload, { merge: true })

    // keep status + images in sync
    existingStatus.value = status
    form.value.coverImages = uploadedUrls
    previewUrls.value = uploadedUrls
    imageFiles.value = []

    // ✅ SUCCESS NOTICE (this is what AddContentLayout renders)
    const msg =
      status === 'published'
        ? 'Event published.'
        : 'Event saved as draft.'
    showNotice({ type: 'success', title: msg })

    // ✅ Clear form only when creating a NEW event
    if (isNew) {
      form.value = { ...initialForm }
      previewUrls.value = []
      imageFiles.value = []
    }
  } catch (err) {
    console.error('Error saving event:', err)
    showNotice({
      type: 'error',
      title: 'Something went wrong. Please try again.',
    })
  } finally {
    loading.value = false
    lastAction.value = null
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

function goBack() {
  router.push('/admin/super-admin/events')
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
