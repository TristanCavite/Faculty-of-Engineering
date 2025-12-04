<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage OBE Page</h1>
    </div>

    <!-- Notice banner -->
    <div v-if="notice" class="mb-2">
      <div
        class="flex items-center justify-between rounded-md border px-4 py-2 text-sm"
        :class="
          notice.type === 'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'border-red-300 bg-red-50 text-red-800'
        "
      >
        <span>{{ notice.title }}</span>
        <button
          type="button"
          class="ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold leading-none"
          @click="notice = null"
        >
          <span aria-hidden="true">×</span>
          <span class="sr-only">Close</span>
        </button>
      </div>
    </div>

    <!-- Form Section -->
    <div class="grid gap-6">
      <!-- Cover Image -->
      <div>
        <label class="mb-1 block font-semibold">Cover Image</label>

        <UiSingleImageUpload
          :imageUrl="pendingCoverPreview || form.coverImageUrl"
          @change="handleImage"
        />

        <p v-if="pendingCoverPreview" class="mt-1 text-xs text-amber-600">
          This image is not saved yet — it will be uploaded when you click
          <b>Save Changes</b>.
        </p>
      </div>

      <!-- Video link (optional) -->
      <div>
        <label class="mb-1 block font-semibold">
          Promotional Video (YouTube/Vimeo)
          <span class="text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <input
          v-model="form.videoUrl"
          type="url"
          class="input input-bordered w-full"
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <p class="mt-1 text-xs text-gray-500">
          Leave this blank if there is no video for this page.
        </p>

        <!-- Video preview -->
        <div
          v-if="normalizedVideoEmbedUrl"
          class="mt-3 aspect-video w-full overflow-hidden rounded border bg-black"
        >
          <iframe
            :src="normalizedVideoEmbedUrl"
            class="h-full w-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          />
        </div>
      </div>

      <!-- Content -->
      <div>
        <label class="mb-2 block font-semibold">Content</label>

        <!-- Edit / Cancel toggle -->
        <UiButton class="bg-maroon text-white hover:opacity-90" @click="toggleEdit">
          {{ isEditing ? 'Cancel' : 'Edit Content' }}
        </UiButton>

        <!-- PREVIEW: same wrapper/classes as public pages -->
        <div
          v-if="!isEditing"
          class="cet-content prose max-w-none rounded border bg-white p-4 shadow"
          v-html="form.content"
        />

        <!-- EDITOR -->
        <div v-else class="cet-content prose max-w-none rounded border bg-white p-4 shadow">
          <UiTiptapEditor
            v-model="form.content"
            :editing="isEditing"
            @image-upload="handleEditorImageUpload"
          />
        </div>

        <!-- Save -->
        <div class="mt-4 flex items-center justify-end gap-3">
          <span v-if="!isDirty" class="text-sm text-gray-400">No changes</span>
          <UiButton
            class="bg-maroon text-white hover:opacity-90 disabled:opacity-50"
            :disabled="!isDirty"
            @click="savePage"
          >
            Save Changes
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import UiTiptapEditor from '@/components/UiTiptapEditor.vue'
import UiSingleImageUpload from '@/components/Admin/UiSingleImageUpload.vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { computed, onMounted, ref } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'

definePageMeta({
  middleware: ['auth'],
  roles: ['faculty'],
  layout: 'faculty',
})

const db = useFirestore()
const storage = useFirebaseStorage()

/** UI state */
const isEditing = ref(false)

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
const baseline = ref({ coverImageUrl: '', content: '', videoUrl: '' })

/* Notice state (green / red banner) */
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

/** Normalized embed URL for preview */
const normalizedVideoEmbedUrl = computed(() => {
  const raw = form.value.videoUrl?.trim()
  if (!raw) return ''

  try {
    const u = new URL(raw)

    // Basic YouTube handling (youtube.com or youtu.be)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = ''

      if (u.hostname.includes('youtu.be')) {
        // https://youtu.be/VIDEOID
        videoId = u.pathname.replace('/', '')
      } else {
        // https://www.youtube.com/watch?v=VIDEOID
        videoId = u.searchParams.get('v') || ''
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
      return raw
    }

    // For other providers (e.g., Vimeo) just use the raw URL
    return raw
  } catch {
    // If URL parsing fails, just return raw value
    return raw
  }
})

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

/** Pick cover image (from UiSingleImageUpload change event) */
function handleImage(e: Event) {
  const file = (e.target as HTMLInputElement)?.files?.[0]
  if (!file) return

  if (pendingCoverPreview.value) {
    URL.revokeObjectURL(pendingCoverPreview.value as string)
  }
  pendingCoverFile.value = file
  pendingCoverPreview.value = URL.createObjectURL(file)
}

/** TipTap image uploader */
async function handleEditorImageUpload(file: File) {
  const path = `editor_images/${Date.now()}-${file.name}`
  const fileRef = storageRef(storage, path)
  const snap = await uploadBytes(fileRef, file)
  return await getDownloadURL(snap.ref)
}

/** Save changes */
async function savePage() {
  if (!isDirty.value) return

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
  }
}

/** Toggle edit mode */
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

<style>
.bg-maroon {
  background-color: #740505;
}

.ProseMirror {
  outline: none !important;
}

.EditorContent {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  min-height: 300px;
  background-color: #ffffff;
}

.resizable-image {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.5rem 0;
}

.EditorContent span[style*='font-size'],
.EditorContent span[style*='color'] {
  display: inline-block;
}
</style>
