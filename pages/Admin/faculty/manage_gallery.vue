<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
     <div class="flex flex-col">
        <span class="font-montserrat text-4xl font-bold text-red-900"> Manage Gallery</span>
        <span class="font-montserrat text-xs">
          Manage Gallery Images for Various Pages
        </span>
      </div>

    <!-- Tip -->
    <p class="text-sm text-gray-500">
      Tip: Use wide images (e.g., <span class="font-semibold">1920×800</span>). Images here
      are used for the homepage carousel and as cover images for selected pages.
    </p>

    <!-- Select page -->
    <div class="space-y-2">
      <label class="mb-1 block text-sm font-semibold">Select page</label>
      <select
        v-model="selectedPage"
        class="select select-bordered w-full max-w-md"
      >
        <option value="main">Main Page Carousel</option>
        <option value="office">Office &amp; Administration</option>
        <option value="research">Research</option>
        <option value="news">News</option>
        <option value="downloads">College Downloads</option>
      </select>
    </div>

    <!-- MAIN PAGE CAROUSEL (multiple images) -->
    <section
      v-if="selectedPage === 'main'"
      class="space-y-3"
    >
      <h2 class="text-lg font-semibold">Main Page Carousel</h2>

      <CoverImageUploader
        v-model:existing="mainExistingUrls"
        v-model:newFiles="mainNewFiles"
        hint="Recommended size: 1920×800 (landscape). New images are added to the homepage carousel."
      />
    </section>

    <!-- OFFICE & ADMINISTRATION COVER -->
    <section
      v-else-if="selectedPage === 'office'"
      class="space-y-3"
    >
      <h2 class="text-lg font-semibold">Office &amp; Administration Cover</h2>
      <UiSingleImageUpload
        :image-url="covers.office?.imageUrl || ''"
        @change="handleSingleCoverChange('office', $event)"
      />
      <p class="text-xs text-gray-500">
        Recommended size: 1920×800 (landscape).
      </p>
    </section>

    <!-- RESEARCH COVER -->
    <section
      v-else-if="selectedPage === 'research'"
      class="space-y-3"
    >
      <h2 class="text-lg font-semibold">Research Cover</h2>
      <UiSingleImageUpload
        :image-url="covers.research?.imageUrl || ''"
        @change="handleSingleCoverChange('research', $event)"
      />
      <p class="text-xs text-gray-500">
        Recommended size: 1920×800 (landscape).
      </p>
    </section>

    <!-- NEWS COVER -->
    <section
      v-else-if="selectedPage === 'news'"
      class="space-y-3"
    >
      <h2 class="text-lg font-semibold">News Cover</h2>
      <UiSingleImageUpload
        :image-url="covers.news?.imageUrl || ''"
        @change="handleSingleCoverChange('news', $event)"
      />
      <p class="text-xs text-gray-500">
        Recommended size: 1920×800 (landscape).
      </p>
    </section>

    <!-- COLLEGE DOWNLOADS COVER -->
    <section
      v-else-if="selectedPage === 'downloads'"
      class="space-y-3"
    >
      <h2 class="text-lg font-semibold">College Downloads Cover</h2>
      <UiSingleImageUpload
        :image-url="covers.downloads?.imageUrl || ''"
        @change="handleSingleCoverChange('downloads', $event)"
      />
      <p class="text-xs text-gray-500">
        Recommended size: 1920×800 (landscape).
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage'
import { useFirestore, useFirebaseStorage } from 'vuefire'

import CoverImageUploader from '@/components/Admin/CoverImageUploader.vue'
import UiSingleImageUpload from '@/components/Admin/UiSingleImageUpload.vue'

definePageMeta({
  middleware: ['auth'],
  roles: ['faculty'],
  layout: 'faculty',
})

const db = useFirestore()
const storage = useFirebaseStorage()

type PageKey = 'main' | 'office' | 'research' | 'news' | 'downloads'
type SinglePageKey = Exclude<PageKey, 'main'>

/** Which page is selected in the dropdown */
const selectedPage = ref<PageKey>('main')

/** Global busy flag (any upload / delete) */
const busy = ref(false)

/* ------------------------------------------------------------------ */
/* Main page carousel (multi-image)                                   */
/* ------------------------------------------------------------------ */

type MainImage = {
  id: string
  imageUrl: string
  storagePath: string
}

const mainImages = ref<MainImage[]>([])
const mainExistingUrls = ref<string[]>([])
const mainNewFiles = ref<File[]>([])

/** Load homepage_gallery images on mount */
async function loadMainCarousel() {
  const q = query(collection(db, 'homepage_gallery'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)

  const list: MainImage[] = []
  snap.forEach(d => {
    const data = d.data() as any
    list.push({
      id: d.id,
      imageUrl: data.imageUrl || '',
      storagePath: data.storagePath || `homepage_gallery/${d.id}.jpg`,
    })
  })

  mainImages.value = list
  mainExistingUrls.value = list.map(i => i.imageUrl)
}

/** Upload new main-carousel files whenever newFiles changes */
watch(
  mainNewFiles,
  files => {
    if (!files || !files.length) return
    uploadNewMainFiles(files)
  },
  { deep: true },
)

async function uploadNewMainFiles(files: File[]) {
  if (!files.length) return
  busy.value = true

  try {
    for (const file of files) {
      // 1) create doc to get id
      const docRef = await addDoc(collection(db, 'homepage_gallery'), {
        imageUrl: '',
        storagePath: '',
        createdAt: serverTimestamp(),
      })

      // 2) upload to Storage
      const path = `homepage_gallery/${docRef.id}-${file.name}`
      const sref = storageRef(storage, path)
      const uploadSnap = await uploadBytes(sref, file)
      const url = await getDownloadURL(uploadSnap.ref)

      // 3) update doc
      await setDoc(
        doc(db, 'homepage_gallery', docRef.id),
        { imageUrl: url, storagePath: path, updatedAt: serverTimestamp() },
        { merge: true },
      )

      // 4) update local state ( prepend so newest first )
      mainImages.value.unshift({
        id: docRef.id,
        imageUrl: url,
        storagePath: path,
      })
    }

    mainExistingUrls.value = mainImages.value.map(i => i.imageUrl)
  } catch (err) {
    console.error('Failed to upload carousel images:', err)
    alert('Failed to upload one or more images.')
  } finally {
    busy.value = false
    mainNewFiles.value = []
  }
}

/** When user removes an existing image in CoverImageUploader, delete it from Firestore/Storage */
watch(
  mainExistingUrls,
  (newUrls, oldUrls) => {
    // skip initial set
    if (!oldUrls || !oldUrls.length) return

    const removed = oldUrls.filter(u => !newUrls.includes(u))
    if (!removed.length) return

    removed.forEach(async url => {
      const item = mainImages.value.find(i => i.imageUrl === url)
      if (!item) return

      busy.value = true
      try {
        if (item.storagePath) {
          const sref = storageRef(storage, item.storagePath)
          await deleteObject(sref).catch(() => {})
        }
        await deleteDoc(doc(db, 'homepage_gallery', item.id))

        mainImages.value = mainImages.value.filter(i => i.id !== item.id)
      } catch (err) {
        console.error('Failed to delete carousel image:', err)
        alert('Failed to delete image.')
      } finally {
        busy.value = false
      }
    })
  },
  { deep: true },
)

/* ------------------------------------------------------------------ */
/* Single-page covers (office, research, news, downloads)             */
/* ------------------------------------------------------------------ */

type SingleCover = {
  imageUrl: string
  storagePath: string
}

const covers = ref<Record<SinglePageKey, SingleCover | null>>({
  office: null,
  research: null,
  news: null,
  downloads: null,
})

/** Firestore doc IDs for covers */
const coverDocIds: Record<SinglePageKey, string> = {
  office: 'office_admin',
  research: 'research',
  news: 'news',
  downloads: 'downloads',
}

/** Load all covers on mount */
async function loadAllCovers() {
  const keys: SinglePageKey[] = ['office', 'research', 'news', 'downloads']

  await Promise.all(
    keys.map(async key => {
      const id = coverDocIds[key]
      const snap = await getDoc(doc(db, 'page_covers', id))

      if (snap.exists()) {
        const data = snap.data() as any
        covers.value[key] = {
          imageUrl: data.imageUrl || '',
          storagePath: data.storagePath || '',
        }
      } else {
        covers.value[key] = null
      }
    }),
  )
}

/** Handle upload for a single-cover page */
async function handleSingleCoverChange(page: SinglePageKey, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  busy.value = true

  try {
    const existing = covers.value[page]

    // delete previous file (if any)
    if (existing?.storagePath) {
      await deleteObject(storageRef(storage, existing.storagePath)).catch(() => {})
    }

    const docId = coverDocIds[page]
    const path = `page_covers/${docId}/${Date.now()}-${file.name}`
    const sref = storageRef(storage, path)
    const uploadSnap = await uploadBytes(sref, file)
    const url = await getDownloadURL(uploadSnap.ref)

    await setDoc(
      doc(db, 'page_covers', docId),
      {
        imageUrl: url,
        storagePath: path,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    covers.value[page] = {
      imageUrl: url,
      storagePath: path,
    }
  } catch (err) {
    console.error(`Failed to upload ${page} cover:`, err)
    alert('Failed to upload image. Please try again.')
  } finally {
    busy.value = false
  }
}

/* ------------------------------------------------------------------ */
/* Init                                                                */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  await Promise.all([loadMainCarousel(), loadAllCovers()])
})
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
.border-maroon {
  border-color: #740505;
}
</style>
