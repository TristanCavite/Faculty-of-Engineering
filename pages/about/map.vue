<template>
  <main class="bg-white">
    <!-- Hero with dynamic cover image -->
    <div class="relative flex w-full items-center font-playfair">
      <img
        :src="coverImage"
        :alt="`${pageTitle} cover`"
        class="h-44 w-full object-cover md:h-128"
      />
      <div
        class="absolute left-6 top-16 bg-gray-700/90 px-2 py-2 md:left-[120px] md:top-40 md:px-4 md:py-4"
      >
        <span class="text-xl text-white md:text-6xl">
          {{ pageTitle }}
        </span>
      </div>
    </div>

    <!-- Main container: heading, map, optional video, grey content card -->
    <div
      class="mx-auto mt-10 flex h-auto w-full flex-col items-center space-y-8 md:w-3/4 md:space-y-10"
    >
      <!-- Heading above map (big maroon text) -->
      <div class="text-center">
        <span
          class="font-playfair text-2xl font-bold text-red-900 md:text-5xl"
        >
          {{ headerTitle }}
        </span>
      </div>

      <!-- Google Map (responsive, good size on mobile) -->
      <div class="w-full cursor-pointer md:mx-auto md:mt-4 md:w-3/4">
        <div
          class="relative w-full overflow-hidden rounded pb-[56.25%]" 
        >
          <iframe
            width="100%"
            height="100%"
            style="border:0"
            src="https://maps.google.com/maps?q=10.7470925,124.7950265&z=19&output=embed"
            allowfullscreen
            loading="lazy"
            class="absolute inset-0 h-full w-full"
          ></iframe>
        </div>
      </div>

      <!-- Optional video section (same behavior as Faculty/Facilities) -->
      <div
        v-if="videoEmbedUrl"
        class="h-auto w-full rounded-xl p-2 md:mx-auto md:h-128 md:w-3/4"
      >
        <iframe
          :src="videoEmbedUrl"
          title="Map and Location video"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="h-56 w-full rounded-md md:h-full"
        ></iframe>
      </div>

      <!-- Grey content card (same style as Faculty) -->
      <div class="mx-auto mb-12 w-11/12 md:w-3/4">
        <div
          class="rounded-lg border border-neutral-200 bg-neutral-100 px-6 py-8 md:px-10 md:py-10"
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
definePageMeta({
  layout: 'custom',
})

import { computed } from 'vue'
import { doc } from 'firebase/firestore'
import { useFirestore, useDocument } from 'vuefire'

const db = useFirestore()

// about_sections > map_location
const { data: section } = useDocument(
  doc(db, 'about_sections', 'map_location'),
)

// Page title: use Firestore title if present, else fallback
const pageTitle = computed(() => {
  const t = section.value?.title
  return t && String(t).trim().length ? String(t) : 'Map & Location'
})

// Uppercase variant for the big heading above the map
const headerTitle = computed(() => pageTitle.value.toUpperCase())

// Cover image with safe fallback
const coverImage = computed(
  () => section.value?.coverImageUrl || '/images/cet_map.jpg',
)

// Rich text content
const contentHtml = computed(() => section.value?.content || '')

// Build an embeddable URL from videoUrl (YouTube / Vimeo)
const videoEmbedUrl = computed(() => {
  const raw = section.value?.videoUrl as string | undefined
  if (!raw) return null

  try {
    const u = new URL(raw)

    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (!v) return null
      const list = u.searchParams.get('list')
      let embed = `https://www.youtube.com/embed/${v}`
      if (list) embed += `?list=${list}`
      return embed
    }

    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      if (!id) return null
      return `https://www.youtube.com/embed/${id}`
    }

    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean)
      const id = parts[parts.length - 1]
      if (!id) return null
      return `https://player.vimeo.com/video/${id}`
    }

    return raw
  } catch {
    return raw
  }
})
</script>
