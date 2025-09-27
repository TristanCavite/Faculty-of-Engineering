<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        {{ isEditMode ? "Edit News" : "Create News" }}
      </h1>

      <!-- Actions -->
      <div class="space-x-2">
        <UiButton
          class="text-maroon border-maroon hover:bg-maroon border bg-white hover:text-white"
          @click="handleClose"
        >
          Close
        </UiButton>
        <UiButton
          class="text-maroon border-maroon hover:bg-maroon border bg-white hover:text-white"
          @click="submitNews(false)"
        >
          Save
        </UiButton>
        <UiButton class="bg-maroon text-white hover:opacity-90" @click="submitNews(true)">
          Publish
        </UiButton>
      </div>
    </div>

    <!-- Basic fields -->
    <div class="grid gap-6 md:grid-cols-2">
      <div>
        <label class="mb-1 block font-semibold">Title</label>
        <input v-model="form.title" type="text" class="input input-bordered w-full" />
      </div>

      <div>
        <label class="mb-1 block font-semibold">Author</label>
        <input v-model="form.author" type="text" class="input input-bordered w-full" />
      </div>

      <!-- Cover Image -->
      <div class="md:col-span-2">
        <label class="mb-1 block font-semibold">Cover Image</label>
        <input
          type="file"
          class="file-input file-input-bordered w-full"
          accept="image/*"
          @change="handleCoverImage"
        />
        <img
          v-if="form.imageUrl"
          :src="form.imageUrl"
          class="mt-2 h-48 w-full rounded object-cover"
        />
      </div>

      <!-- Description -->
      <div class="md:col-span-2">
        <label class="mb-1 block font-semibold">Description</label>
        <textarea v-model="form.description" rows="3" class="textarea textarea-bordered w-full" />
      </div>
    </div>

    <!-- Content (Editor is always shown) -->
    <div>
      <label class="mb-2 block font-semibold">Content</label>
      <UiTiptapEditor
        v-model="form.content"
        :editing="true"
        class="mt-2"
        @image-upload="handleEditorImageUpload"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import UiTiptapEditor from '@/components/UiTiptapEditor.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore, useFirebaseStorage } from 'vuefire'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

definePageMeta({ middleware: 'auth', layout: 'super-admin' })

const route = useRoute()
const router = useRouter()
const db = useFirestore()
const storage = useFirebaseStorage()

/** Page state */
const isEditMode = ref(false)
const newsId = ref<string | null>(null)

/** Form model */
const form = ref<{
  title: string
  author: string
  description: string
  imageUrl: string
  content: string
  published?: boolean
  createdAt?: Timestamp
}>({
  title: '',
  author: '',
  description: '',
  imageUrl: '',
  content: '',
})

/** Prefill in edit mode via ?id=... */
onMounted(async () => {
  const id = (route.query.id as string) || null
  if (!id) return

  isEditMode.value = true
  newsId.value = id

  const snap = await getDoc(doc(db, 'news', id))
  if (snap.exists()) {
    const data: any = snap.data()
    form.value.title = data.title || ''
    form.value.author = data.author || ''
    form.value.description = data.description || ''
    form.value.imageUrl = data.imageUrl || ''
    form.value.content = data.content || ''
    form.value.createdAt = data.createdAt
  }
})

/** Cover image upload to Storage */
async function handleCoverImage(e: Event) {
  const file = (e.target as HTMLInputElement)?.files?.[0]
  if (!file) return
  try {
    const path = `news_images/${Date.now()}-${file.name}`
    const fileRef = storageRef(storage, path)
    const snap = await uploadBytes(fileRef, file)
    form.value.imageUrl = await getDownloadURL(snap.ref)
  } catch (err) {
    console.error('❌ Cover image upload failed:', err)
    alert('Failed to upload cover image.')
  }
}

/** Image upload for the editor (UiTiptapEditor @image-upload) */
async function handleEditorImageUpload(file: File): Promise<string> {
  const path = `editor_images/news/${Date.now()}-${file.name}`
  const fileRef = storageRef(storage, path)
  const snap = await uploadBytes(fileRef, file)
  return await getDownloadURL(snap.ref)
}

/** Save handler (draft/publish) */
async function submitNews(publish: boolean) {
  if (!form.value.title || !form.value.content) {
    alert('Title and content are required.')
    return
  }
  if (!form.value.imageUrl) {
    alert('Please upload a cover image.')
    return
  }

  const payload = {
    title: form.value.title,
    author: form.value.author,
    description: form.value.description,
    imageUrl: form.value.imageUrl,
    content: form.value.content,
    published: publish,
    createdAt: isEditMode.value ? form.value.createdAt ?? serverTimestamp() : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  try {
    if (isEditMode.value && newsId.value) {
      await setDoc(doc(db, 'news', newsId.value), payload, { merge: true })
      alert('News updated!')
      router.push(`/Admin/super-admin/news/${newsId.value}`)
    } else {
      const ref = await addDoc(collection(db, 'news'), payload)
      alert(publish ? 'News published!' : 'News saved as draft.')
      router.push(`/Admin/super-admin/news/${ref.id}`)
    }
  } catch (error) {
    console.error('❌ Failed to save news:', error)
    alert('Failed to save news. Check your Firestore rules/connection.')
  }
}

/** Close behavior */
function handleClose() {
  if (isEditMode.value && newsId.value) {
    router.push(`/Admin/super-admin/news/${newsId.value}`)
  } else {
    router.push('/Admin/super-admin/news')
  }
}
</script>

<style>
.text-maroon { color: #740505; }
.bg-maroon { background-color: #740505; }
.border-maroon { border-color: #740505; }

/* Keep editor visuals consistent with the rest of the admin */
.ProseMirror {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}
.EditorContent {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  min-height: 300px;
  background-color: #ffffff;
}
</style>
