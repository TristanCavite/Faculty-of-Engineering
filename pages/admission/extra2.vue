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

    <!-- Main Content Container (same style as extra1 / graduate) -->
    <div class="mx-auto mt-10 h-auto w-full md:w-3/4 space-y-6 md:space-y-8">
      <!-- If admin hid the page -->
      <div v-if="!isVisible" class="py-20 text-center">
        <h2 class="text-2xl font-semibold">This page is not available</h2>
        <p class="mt-2 text-gray-600">
          The content on this page has been hidden by the site administrator.
        </p>
      </div>

      <!-- Actual content when visible -->
      <template v-else>
        <!-- Optional video section -->
        <div
          v-if="hasVideo"
          class="h-auto w-full rounded-xl p-2 md:mx-auto md:h-128 md:w-3/4"
        >
          <!-- YouTube embed -->
          <iframe
            v-if="sectionData?.videoUrl && sectionData.videoUrl.includes('youtube.com')"
            :src="getYoutubeEmbedUrl(sectionData.videoUrl)"
            frameborder="0"
            allowfullscreen
            class="object-fit h-56 w-full rounded-md md:h-full"
          ></iframe>

          <!-- Fallback for direct video URLs (.mp4 etc.) -->
          <video
            v-else
            :src="sectionData?.videoUrl"
            controls
            preload="auto"
            playsinline
            class="h-56 w-full rounded-md object-cover md:h-full"
          ></video>
        </div>

        <!-- Grey content card -->
        <div class="mx-auto mb-12 w-11/12 md:w-3/4 md:mb-16">
          <div
            class="bg-neutral-100 border border-neutral-200 rounded-lg px-6 py-8 md:px-10 md:py-10"
          >
            <div
              class="cet-content prose max-w-none"
              v-html="contentHtml"
            ></div>
          </div>
        </div>

        <!-- Tiny loading fallback if visible but no content yet -->
        <div v-if="!contentHtml" class="m-5 text-center text-sm text-gray-500">
          Loading…
        </div>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFirestore, useDocument } from 'vuefire'
import { doc } from 'firebase/firestore'

definePageMeta({ layout: 'custom' })

const db = useFirestore()

// admission_sections > extra_section_2
const { data: section } = useDocument(
  doc(db, 'admission_sections', 'extra_section_2')
)

// convenient alias for template use
const sectionData = computed(() => section.value || null)

const FALLBACK = '/images/default_about_cover.jpg'

// Title (admin-editable, else fallback)
const pageTitle = computed(() => {
  const t = section.value?.title as string | undefined
  return t && t.trim().length ? t : 'Extra Section'
})

// Cover image
const coverImage = computed(
  () => section.value?.coverImageUrl || FALLBACK
)

// Rich text HTML
const contentHtml = computed(
  () => (section.value?.content as string | undefined) || ''
)

// Optional video
const hasVideo = computed(() => !!section.value?.videoUrl)

// Visibility flag (default visible)
const isVisible = computed(() => section.value?.isVisible !== false)

// YouTube embed conversion
function getYoutubeEmbedUrl(url: string): string {
  try {
    const videoId = new URL(url).searchParams.get('v')
    return `https://www.youtube.com/embed/${videoId}`
  } catch (e) {
    console.error('Invalid YouTube URL:', url)
    return ''
  }
}
</script>
