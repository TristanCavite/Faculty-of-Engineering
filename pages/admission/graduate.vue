<template>
  <main class="bg-white">
    <!-- Header with dynamic cover image -->
    <div class="relative flex items-center w-full font-playfair">
      <img
        :src="admissionData?.coverImageUrl || '/images/fallback.jpg'"
        alt="Graduate Cover"
        class="object-cover w-full h-44 md:h-128"
      />
      <div
        class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90"
      >
        <span class="text-xl text-white md:text-6xl">Graduate</span>
      </div>
    </div>

    <!-- Main Content Container (same layout style as faculty / undergrad) -->
    <div class="mx-auto mt-10 h-auto w-full md:w-3/4 space-y-6 md:space-y-8">
      <!-- ✅ Optional video section -->
      <div
        v-if="hasVideo"
        class="h-auto w-full rounded-xl p-2 md:mx-auto md:h-128 md:w-3/4"
      >
        <!-- YouTube embed -->
        <iframe
          v-if="admissionData?.videoUrl && admissionData.videoUrl.includes('youtube.com')"
          :src="getYoutubeEmbedUrl(admissionData.videoUrl)"
          frameborder="0"
          allowfullscreen
          class="object-fit h-56 w-full rounded-md md:h-full"
        ></iframe>

        <!-- Fallback for direct video URLs (e.g., .mp4 from Firebase) -->
        <video
          v-else
          :src="admissionData?.videoUrl"
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
            v-html="admissionData?.content"
          ></div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFirestore, useDocument } from 'vuefire'
import { doc } from 'firebase/firestore'

const db = useFirestore()

// Fetch from: admission_sections > graduate
const { data: admissionData } = useDocument(
  doc(db, 'admission_sections', 'graduate')
)

// true only when we actually have a video URL
const hasVideo = computed(() => !!admissionData.value?.videoUrl)

// Convert regular YouTube URL to embed URL
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

<script lang="ts">
definePageMeta({
  layout: 'custom',
})
</script>
