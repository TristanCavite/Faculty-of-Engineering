<template>
  <AddContentLayout
    createTitle="Add New Event"
    editTitle="Edit Event"
    :isEditMode="isEditMode"
    :saving="loading"
    :lastAction="lastAction"
    :notice="notice"
    :validationError="validationError"
    :isValid="isFormValid"
    @close="router.push('/admin/head-admin/events')"
    @save="saveEvent(false)"
    @publish="saveEvent(true)"
    @clear-notice="notice = null"
  >
    <!-- Small info text in edit mode -->
    <div v-if="isEditMode" class="mb-2 text-sm text-gray-500">
      You are editing an existing event.
    </div>

    <!-- Form body (unchanged layout) -->
    <form
      @submit.prevent
      @keydown.enter.capture="preventEnterSubmit"
      class="space-y-6"
      novalidate
    >
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
        <input
          v-model="form.title"
          type="text"
          class="input input-bordered w-full"
          placeholder="Enter event title"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
        <input v-model="form.date" type="date" class="input input-bordered w-full" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
        <input v-model="form.dateEnd" type="date" class="input input-bordered w-full" />
        <p class="mt-1 text-xs text-gray-500">
          Leave blank if the event is only one day.
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">
          Event Type / Audience
        </label>
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

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">
          Short Description
        </label>
        <textarea
          v-model="form.description"
          rows="3"
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
import CoverImageUploader from '@/components/Admin/CoverImageUploader.vue'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore, useStorage } from 'vuefire'

definePageMeta({
  middleware: ['auth'],
  roles: ['head_admin'],
  layout: 'head-admin',
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
type EventType = (typeof EVENT_TYPES)[number]['value'] | ''

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

/** Files that still need to be uploaded */
const imageFiles = ref<File[]>([])

const loading = ref(false)
const lastAction = ref<'save' | 'publish' | null>(null)
const editorReady = ref(false)
const validationError = ref<string | null>(null)
const existingStatus = ref<Status>('draft')

/* notices */
type NoticeType = 'success' | 'error'
const notice = ref<{ type: NoticeType; title: string } | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null
function showNotice(n: { type: NoticeType; title: string }, ms = 3000) {
  notice.value = n
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (notice.value = null), ms)
}

/** lightweight validity for disabling buttons */
const isFormValid = computed(() => {
  const { title, date, eventType, description, content } = form.value
  return (
    !!title.trim() &&
    !!date &&
    !!eventType &&
    !!description.trim() &&
    !!content.trim()
  )
})

function deriveStatus(data: any): Status {
  const raw = typeof data.status === 'string' ? data.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') return raw
  return data.published === true ? 'published' : 'draft'
}

onMounted(async () => {
  editorReady.value = true
  const id = route.query.id as string | undefined
  if (!id) return

  const snap = await getDoc(doc(db, 'events', id))
  if (!snap.exists()) return

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
})

function validateForm() {
  if (!isFormValid.value) {
    validationError.value = 'Please fill in all required fields.'
    return false
  }
  validationError.value = null
  return true
}

async function saveEvent(publish: boolean) {
  if (loading.value) return
  lastAction.value = publish ? 'publish' : 'save'

  if (!validateForm()) {
    lastAction.value = null
    return
  }

  loading.value = true

  try {
    const idFromRoute = route.query.id as string | undefined
    const id = idFromRoute || crypto.randomUUID()

    // Start with existing cover images
    let coverImages: string[] = [...(form.value.coverImages || [])]

    // Upload any newly selected images
    if (imageFiles.value.length) {
      const offset = coverImages.length
      for (const [index, file] of imageFiles.value.entries()) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `events/${id}/cover_${offset + index}.${ext}`
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, file)
        coverImages.push(await getDownloadURL(fileRef))
      }
    }

    const status: Status = publish
      ? 'pending'
      : isEditMode.value
        ? existingStatus.value
        : 'draft'

    const payload: any = {
      ...form.value,
      coverImages,
      status,
      published: status === 'published',
      publishedAt: status === 'published' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    }

    const isNew = !isEditMode.value
    if (isNew) {
      payload.createdAt = serverTimestamp()
    }

    await setDoc(doc(collection(db, 'events'), id), payload, { merge: true })
    existingStatus.value = status
    form.value.coverImages = coverImages

    const message =
      status === 'pending' ? 'Event submitted for approval.' : 'Event saved.'
    showNotice({ type: 'success', title: message })

    if (isNew) {
      // clear form + local files after creating a new event
      form.value = {
        title: '',
        date: '',
        dateEnd: '',
        description: '',
        content: '',
        coverImages: [],
        eventType: '' as EventType,
      }
      imageFiles.value = []
      validationError.value = null
    } else {
      // if editing, just clear local new files
      imageFiles.value = []
    }
  } catch (err) {
    console.error(err)
    showNotice({
      type: 'error',
      title: 'Something went wrong while saving the event.',
    })
  } finally {
    loading.value = false
    lastAction.value = null
  }
}

function preventEnterSubmit(e: KeyboardEvent) {
  const el = e.target as HTMLElement
  if (el.tagName !== 'TEXTAREA' && !(el as any).isContentEditable) {
    e.preventDefault()
  }
}

function blockSubmitsFromEditor(e: Event) {
  const btn = (e.target as HTMLElement)?.closest('button') as
    | HTMLButtonElement
    | null
  if (btn && (!btn.type || btn.type.toLowerCase() === 'submit')) {
    e.preventDefault()
  }
}

const handleEditorImageUpload = async (file: File): Promise<string> => {
  const id = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `events/editor/${id}.${ext}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file)
  return await getDownloadURL(fileRef)
}
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
.btn-outline-maroon {
  background-color: #ffffff;
  border: 1px solid #740505;
  color: #740505;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.btn-outline-maroon:hover {
  background-color: #740505;
  color: #ffffff;
}
</style>
