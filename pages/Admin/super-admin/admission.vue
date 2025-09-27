<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage Admission Page</h1>
    </div>

    <!-- Section Selector -->
    <div>
      <label class="mb-1 block font-semibold">Select Section</label>
      <select v-model="selectedSection" class="select select-bordered w-full">
        <option disabled value="">-- Choose section --</option>
        <option value="why_choose_vsu">Why Choose VSU?</option>
        <option value="undergraduate">Undergraduate</option>
        <option value="graduate">Graduate</option>

        <!-- extras appended from Firestore collection -->
        <option
          v-for="s in extraSections"
          :key="s.id"
          :value="s.id"
        >
          {{ (s.title && s.title.trim()) ? s.title : 'Extra Section' }}
        </option>
      </select>
    </div>

    <!-- Visibility toggle: for undergraduate and extras -->
    <div v-if="isUndergrad || isExtraSection" class="rounded-lg border bg-white p-4 shadow">
      <div class="flex items-start justify-between gap-6">
        <div>
          <h3 class="font-semibold">
            {{ isUndergrad ? 'Show Undergraduate on public' : 'Show on public' }}
          </h3>
          <p class="text-sm text-gray-600">
            When unchecked, this page is hidden from the public navbar and direct links will return 404 / not be displayed.
          </p>
        </div>

        <!-- Simple checkbox; change commits immediately -->
        <label class="flex select-none items-center gap-3">
          <input
            type="checkbox"
            v-model="showSectionPublic"
            class="h-5 w-5 cursor-pointer accent-green-600"
            @change="saveSectionVisibility"
          />
          <span class="text-sm font-medium">{{ showSectionPublic ? 'Visible' : 'Hidden' }}</span>
        </label>
      </div>

      <p v-if="visSavedAt" class="mt-2 text-xs text-gray-500">Updated: {{ visSavedAt }}</p>
    </div>

    <!-- Form Section -->
    <div v-if="selectedSection" class="grid gap-6">
      <!-- Title / Name - only show for extras -->
      <div v-if="isExtraSection">
        <label class="mb-1 block font-semibold">Name / Title Section</label>
        <div class="flex gap-3">
          <input
            v-model="form.title"
            type="text"
            placeholder="Enter the section title (leave empty => 'Extra Section')"
            class="input input-bordered flex-1"
          />
          <UiButton class="bg-maroon text-white" :disabled="!selectedSection" @click="saveTitle">
            Save Title
          </UiButton>
        </div>
      </div>

      <!-- Cover Image -->
      <div>
        <label class="mb-1 block font-semibold">Cover Image</label>
        <input
          ref="coverInput"
          type="file"
          class="file-input file-input-bordered w-full"
          accept="image/*"
          @change="handleImage"
        />

        <img
          v-if="pendingCoverPreview || form.coverImageUrl"
          :src="pendingCoverPreview || form.coverImageUrl"
          class="mt-2 h-48 w-full rounded object-cover"
          alt="Admission cover"
        />
        <p v-if="pendingCoverPreview" class="mt-1 text-xs text-amber-600">
          This image is not saved yet — it will be uploaded when you click <b>Save Changes</b>.
        </p>
      </div>

      <!-- Promotional Video (only for 'Why Choose VSU?') -->
      <div v-if="selectedSection === 'why_choose_vsu'">
        <label class="mb-1 block font-semibold">Promotional Video (YouTube/Vimeo)</label>
        <input
          v-model="form.videoUrl"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          class="input input-bordered w-full"
        />
        <div v-if="form.videoUrl" class="mt-4 aspect-video w-full">
          <iframe
            :src="embedVideoUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="h-full w-full rounded"
          ></iframe>
        </div>
      </div>

      <!-- Content -->
      <div>
        <label class="mb-2 block font-semibold">Content</label>

        <!-- Edit / Cancel toggle -->
        <UiButton class="bg-maroon text-white hover:opacity-90" @click="toggleEdit">
          {{ isEditing ? 'Cancel' : 'Edit Content' }}
        </UiButton>

        <!-- PREVIEW -->
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
            @click="saveSection"
          >
            Save Changes
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Manage Admission - extras + visibility
// Mirrors the Manage About pattern (extra sections + visibility toggle)

// Imports
import UiTiptapEditor from '@/components/UiTiptapEditor.vue'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { computed, ref, watch, onMounted } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'

definePageMeta({ middleware: 'auth', layout: 'super-admin' })

const db = useFirestore()
const storage = useFirebaseStorage()

/* UI state */
const isEditing = ref(false)
const selectedSection = ref('')

// dedicated boolean helpers
const isUndergrad = computed(() => selectedSection.value === 'undergraduate')
const isExtraSection = computed(() =>
  selectedSection.value === 'extra_section_1' || selectedSection.value === 'extra_section_2'
)

/* Form model (title included for extras) */
const form = ref({
  title: '',
  coverImageUrl: '',
  content: '',
  videoUrl: ''
})

const coverInput = ref<HTMLInputElement | null>(null)
const pendingCoverFile = ref<File | null>(null)
const pendingCoverPreview = ref<string | ''>('')

const baseline = ref({ title: '', coverImageUrl: '', content: '', videoUrl: '' })

/* Extra sections dropdown population */
const extraSections = ref<Array<{ id: string; title?: string; order?: number }>>([])

/* Visibility controls */
const showSectionPublic = ref(true)
const visSavedAt = ref<string | ''>('')

/* Ensure admission_sections docs exist (static + extras) on mount */
async function ensureDocsExist() {
  try {
    const extras = ['extra_section_1', 'extra_section_2']
    const required = ['why_choose_vsu', 'undergraduate', 'graduate', ...extras]

    for (const id of required) {
      const snap = await getDoc(doc(db, 'admission_sections', id))
      if (!snap.exists()) {
        await setDoc(doc(db, 'admission_sections', id), {
          title: '', // extras will use this; static sections won't rely on it
          coverImageUrl: '',
          content: '',
          videoUrl: '',
          order: required.indexOf(id),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // leave isVisible undefined; admin UI will mirror it when toggled
        })
      }
    }
  } catch (err) {
    console.error('ensureDocsExist error', err)
  }
}

/* Subscribe to admission_sections collection to populate extras titles */
function subscribeExtras() {
  const colRef = collection(db, 'admission_sections')
  onSnapshot(
    colRef,
    (snap) => {
      const arr: any[] = []
      snap.forEach((d) => {
        const data = d.data() as any
        arr.push({ id: d.id, title: data.title || '', order: data.order ?? 999 })
      })
      arr.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      extraSections.value = arr.filter((x) => x.id === 'extra_section_1' || x.id === 'extra_section_2')
    },
    (err) => {
      console.error('subscribeExtras error', err)
    }
  )
}

onMounted(async () => {
  await ensureDocsExist()
  subscribeExtras()
})

/* Load section content and visibility when selected */
watch(
  selectedSection,
  async (id) => {
    if (!id) return

    // cleanup pending preview
    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string)
    pendingCoverFile.value = null
    pendingCoverPreview.value = ''
    if (coverInput.value) coverInput.value.value = ''

    try {
      const snap = await getDoc(doc(db, 'admission_sections', id))
      if (snap.exists()) {
        const data = snap.data() as any
        form.value.title = data.title || ''
        form.value.coverImageUrl = data.coverImageUrl || ''
        form.value.content = data.content || ''
        form.value.videoUrl = data.videoUrl || ''
      } else {
        form.value.title = ''
        form.value.coverImageUrl = ''
        form.value.content = ''
        form.value.videoUrl = ''
      }

      baseline.value = {
        title: form.value.title,
        coverImageUrl: form.value.coverImageUrl,
        content: form.value.content,
        videoUrl: form.value.videoUrl
      }
      isEditing.value = false

      // load visibility for undergraduate or extras
      if (id === 'undergraduate' || id === 'extra_section_1' || id === 'extra_section_2') {
        await loadSectionVisibility(id)
      } else {
        showSectionPublic.value = true
        visSavedAt.value = ''
      }
    } catch (err) {
      console.error('Error loading admission section', err)
    }
  },
  { immediate: true }
)

/* Dirty check */
const isDirty = computed(
  () =>
    !!pendingCoverFile.value ||
    (form.value.title || '') !== (baseline.value.title || '') ||
    form.value.coverImageUrl !== baseline.value.coverImageUrl ||
    form.value.content !== baseline.value.content ||
    form.value.videoUrl !== baseline.value.videoUrl
)

/* Image pick & preview */
function handleImage(e: Event) {
  const file = (e.target as HTMLInputElement)?.files?.[0]
  if (!file) return
  if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string)
  pendingCoverFile.value = file
  pendingCoverPreview.value = URL.createObjectURL(file)
}

/* TipTap image upload */
async function handleEditorImageUpload(file: File) {
  const path = `admission_editor_images/${Date.now()}-${file.name}`
  const fileRef = storageRef(storage, path)
  const snap = await uploadBytes(fileRef, file)
  return await getDownloadURL(snap.ref)
}

/* Save title (quick action) for extras */
async function saveTitle() {
  if (!selectedSection.value) return
  // only needed for extras but harmless otherwise
  try {
    await updateDoc(doc(db, 'admission_sections', selectedSection.value), {
      title: form.value.title || '',
      updatedAt: serverTimestamp()
    })
    baseline.value.title = form.value.title || ''
    // subscription will update dropdown label automatically
  } catch (err) {
    console.error('saveTitle error', err)
    alert('Failed to save title')
  }
}

/* Save section content (uploads pending cover first) */
async function saveSection() {
  if (!selectedSection.value || !isDirty.value) return

  try {
    if (pendingCoverFile.value) {
      const path = `admission_sections/${selectedSection.value}/cover_${Date.now()}.jpg`
      const fileRef = storageRef(storage, path)
      await uploadBytes(fileRef, pendingCoverFile.value)
      form.value.coverImageUrl = await getDownloadURL(fileRef)
    }

    const payload: Record<string, any> = {
      coverImageUrl: form.value.coverImageUrl || '',
      content: form.value.content || '',
      updatedAt: serverTimestamp()
    }

    if (selectedSection.value === 'why_choose_vsu') {
      payload.videoUrl = form.value.videoUrl || ''
    }

    // include title only for extras
    if (isExtraSection.value) {
      payload.title = form.value.title || ''
    }

    // use merge semantics so static sections keep their fields
    await setDoc(doc(db, 'admission_sections', selectedSection.value), payload, { merge: true })

    // cleanup
    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string)
    pendingCoverFile.value = null
    pendingCoverPreview.value = ''
    if (coverInput.value) coverInput.value.value = ''

    baseline.value = {
      title: form.value.title,
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
      videoUrl: form.value.videoUrl
    }
    isEditing.value = false
    alert('Section updated!')
  } catch (err) {
    console.error('saveSection error', err)
    alert('Failed to save section')
  }
}

/* Embed helper for video */
const embedVideoUrl = computed(() => {
  const url = (form.value.videoUrl || '').trim()
  if (!url) return ''
  try {
    if (url.includes('youtu.be')) {
      const id = url.split('/').pop()?.split('?')[0]
      return id ? `https://www.youtube.com/embed/${id}` : ''
    }
    if (url.includes('youtube.com/watch')) {
      const id = new URL(url).searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : ''
    }
    return url
  } catch {
    return ''
  }
})

/* Toggle edit mode */
function toggleEdit() {
  if (isEditing.value) {
    // cancel -> revert
    form.value.title = baseline.value.title
    form.value.coverImageUrl = baseline.value.coverImageUrl
    form.value.content = baseline.value.content
    form.value.videoUrl = baseline.value.videoUrl

    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string)
    pendingCoverFile.value = null
    pendingCoverPreview.value = ''
    if (coverInput.value) coverInput.value.value = ''

    isEditing.value = false
  } else {
    isEditing.value = true
  }
}

/* ----------------------- Visibility helpers ----------------------- */

/**
 * loadSectionVisibility(id)
 * - reads settings/public_flags and admission_sections/{id}.isVisible
 * - prefers flags doc value first, else section doc, else default true
 */
async function loadSectionVisibility(id: string) {
  try {
    const flagsSnap = await getDoc(doc(db, 'settings', 'public_flags'))
    const secSnap = await getDoc(doc(db, 'admission_sections', id))

    // admissionUndergradVisible kept for undergrad for backwards compatibility
    if (id === 'undergraduate') {
      const flagVal = flagsSnap.exists() ? (flagsSnap.data() as any).admissionUndergradVisible : undefined
      const sectionVal = secSnap.exists() ? (secSnap.data() as any).isVisible : undefined
      showSectionPublic.value = flagVal ?? sectionVal ?? true
      return
    }

    // extras: flags key convention admission_extra_section_1/2
    const flagKey = `admission_${id}` // e.g., admission_extra_section_1
    const flagVal = flagsSnap.exists() ? (flagsSnap.data() as any)[flagKey] : undefined
    const sectionVal = secSnap.exists() ? (secSnap.data() as any).isVisible : undefined
    showSectionPublic.value = flagVal ?? sectionVal ?? true
  } catch (err) {
    console.error('loadSectionVisibility error', err)
    showSectionPublic.value = true
  }
}

/**
 * saveSectionVisibility()
 * - uses writeBatch to atomically write:
 *   - settings/public_flags.{admission_<id>} = boolean   (or admissionUndergradVisible for undergrad)
 *   - admission_sections/{id}.isVisible = boolean
 */
async function saveSectionVisibility() {
  if (!selectedSection.value) return
  try {
    const id = selectedSection.value
    const batch = writeBatch(db)

    if (id === 'undergraduate') {
      // existing admissionUndergradVisible key
      batch.set(
        doc(db, 'settings', 'public_flags'),
        { admissionUndergradVisible: showSectionPublic.value, updatedAt: serverTimestamp() },
        { merge: true }
      )
      batch.set(
        doc(db, 'admission_sections', 'undergraduate'),
        { isVisible: showSectionPublic.value, updatedAt: serverTimestamp() },
        { merge: true }
      )
    } else {
      // extras: flag key admission_extra_section_1 or admission_extra_section_2
      const flagKey = `admission_${id}`
      batch.set(
        doc(db, 'settings', 'public_flags'),
        { [flagKey]: showSectionPublic.value, updatedAt: serverTimestamp() },
        { merge: true }
      )
      batch.set(
        doc(db, 'admission_sections', id),
        { isVisible: showSectionPublic.value, updatedAt: serverTimestamp() },
        { merge: true }
      )
    }

    await batch.commit()
    visSavedAt.value = new Date().toLocaleString()
  } catch (err) {
    console.error('saveSectionVisibility error', err)
    alert('Failed to update visibility. Please try again.')
  }
}
</script>

<style>
/* Brand helper */
.bg-maroon {
  background-color: #740505;
}

/* Editor chrome (typography lives in .cet-content/.prose) */
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
