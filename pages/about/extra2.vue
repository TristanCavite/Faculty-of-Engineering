<!-- pages/about/extra2.vue -->
<template>
  <main class="bg-white">
    <!-- Banner / Hero -->
    <div class="relative flex items-center w-full font-playfair">
      <img
        :src="coverImage"
        :alt="`${pageTitle} cover`"
        class="object-cover w-full h-44 md:h-128"
      />
      <div
        class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90"
      >
        <span class="text-xl text-white md:text-6xl">
          {{ pageTitle }}
        </span>
      </div>
    </div>

    <!-- Main Content Container (same layout as Faculty / Facilities / Extra) -->
    <div class="mx-auto mt-10 h-auto w-full md:w-3/4 space-y-6 md:space-y-8">
      <!-- Optional Video Section -->
      <div
        v-if="videoEmbedUrl"
        class="h-auto w-full rounded-xl p-2 md:mx-auto md:h-128 md:w-3/4"
      >
        <iframe
          :src="videoEmbedUrl"
          :title="`${pageTitle} video`"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="object-fit h-56 w-full rounded-md md:h-full"
        ></iframe>
      </div>

      <!-- Content inside grey card -->
      <div class="mx-auto mb-12 w-11/12 md:w-3/4 md:mb-16">
        <div
          class="bg-neutral-100 border border-neutral-200 rounded-lg px-6 py-8 md:px-10 md:py-10"
        >
          <div
            class="cet-content prose max-w-none"
            v-html="contentHtml"
          ></div>

          <div v-if="!contentHtml" class="mt-4 text-sm text-neutral-500">
            Loading…
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { computed } from 'vue'
import { doc } from 'firebase/firestore'
import { useFirestore, useDocument } from 'vuefire'

const db = useFirestore()

// Firestore document for this extra section
const docRef = doc(db, 'about_sections', 'extra_section_2')
const docSnap = useDocument(docRef)

// Fallback cover image (adjust path if needed)
const FALLBACK_COVER = '/images/default_about_cover.jpg'

// Title (from Firestore, or default)
const pageTitle = computed(() => {
  const t = docSnap.value?.title
  return t && String(t).trim().length ? t : 'Extra Section'
})

// Cover image with fallback
const coverImage = computed(
  () => docSnap.value?.coverImageUrl || FALLBACK_COVER,
)

// HTML content
const contentHtml = computed(() => docSnap.value?.content || '')

// Optional video embed (same logic as other pages)
const videoEmbedUrl = computed(() => {
  const raw = docSnap.value?.videoUrl as string | undefined
  if (!raw) return null

  try {
    const u = new URL(raw)

    // YouTube long URL: https://www.youtube.com/watch?v=XXXX
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (!v) return null
      const list = u.searchParams.get('list')
      let embed = `https://www.youtube.com/embed/${v}`
      if (list) embed += `?list=${list}`
      return embed
    }

    // YouTube short URL: https://youtu.be/XXXX
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      if (!id) return null
      return `https://www.youtube.com/embed/${id}`
    }

    // Vimeo: https://vimeo.com/XXXX
    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean)
      const id = parts[parts.length - 1]
      if (!id) return null
      return `https://player.vimeo.com/video/${id}`
    }

    // Fallback
    return raw
  } catch {
    return raw
  }
})
</script>
