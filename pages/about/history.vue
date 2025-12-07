<!-- pages/about/history.vue -->
<template>
  <main class="bg-white">
    <!-- Banner / Hero -->
    <div class="relative flex items-center w-full font-playfair">
      <img
        :src="coverImage"
        alt="CET History cover"
        class="object-cover w-full h-44 md:h-128"
      />
      <div
        class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90"
      >
        <span class="text-xl text-white md:text-6xl">History</span>
      </div>
    </div>

    <!-- Main Content Container (same as Faculty / Facilities) -->
    <div class="mx-auto mt-10 h-auto w-full md:w-3/4 space-y-6 md:space-y-8">
      <!-- Optional Video Section -->
      <div
        v-if="videoEmbedUrl"
        class="h-auto w-full rounded-xl p-2 md:mx-auto md:h-128 md:w-3/4"
      >
        <iframe
          :src="videoEmbedUrl"
          title="History video"
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
            v-html="section?.content"
          ></div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { doc } from 'firebase/firestore'
import { useFirestore, useDocument } from 'vuefire'

definePageMeta({ layout: 'custom' })

const db = useFirestore()
const { data: section } = useDocument(
  doc(db, 'about_sections', 'history'),
)

// Cover image with fallback to old static asset
const coverImage = computed(
  () => section.value?.coverImageUrl || '/images/cet_history.jpg',
)

// Build an embeddable URL from the stored videoUrl (YouTube / Vimeo)
const videoEmbedUrl = computed(() => {
  const raw = section.value?.videoUrl as string | undefined
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

    // Fallback: use as-is
    return raw
  } catch {
    return raw
  }
})
</script>
