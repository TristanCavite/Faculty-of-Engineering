<template>
  <main class="bg-white">
    <!-- Header with dynamic cover image -->
    <div class="relative flex w-full items-center font-playfair">
      <img
        :src="admissionData?.coverImageUrl || '/images/fallback.jpg'"
        alt="Why Choose VSU Cover"
        class="h-44 w-full object-cover md:h-128"
      />
      <div
        class="absolute left-6 top-16 bg-gray-700/90 px-2 py-2 md:left-[120px] md:top-40 md:px-4 md:py-4"
      >
        <span class="text-xl text-white md:text-6xl">Why Choose VSU?</span>
      </div>
    </div>

    <!-- Main Content Container (same pattern as about/faculty) -->
    <div class="mx-auto mt-10 h-auto w-full md:w-3/4 space-y-6 md:space-y-8">
      <!-- ✅ Video Section: only if there is a videoUrl -->
      <div
        v-if="hasVideo"
        class="h-auto w-full rounded-xl p-2 md:mx-auto md:h-128 md:w-3/4"
      >
        <!-- YouTube Embed -->
        <iframe
          v-if="admissionData?.videoUrl && admissionData.videoUrl.includes('youtube.com')"
          :src="getYoutubeEmbedUrl(admissionData.videoUrl)"
          frameborder="0"
          allowfullscreen
          class="object-fit h-56 w-full rounded-md md:h-full"
        ></iframe>

        <!-- Fallback for direct video URLs (e.g., .mp4 from Firebase Storage) -->
        <video
          v-else
          :src="admissionData?.videoUrl"
          controls
          preload="auto"
          playsinline
          class="h-56 w-full rounded-md object-cover md:h-full"
        ></video>
      </div>

      <!-- Grey Rich Text Content card -->
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
import { computed } from "vue"
import { doc } from "firebase/firestore"
import { useDocument, useFirestore } from "vuefire"

// Firestore setup
const db = useFirestore()

// Fetch from: admission_sections > why_choose_vsu
const { data: admissionData } = useDocument(
  doc(db, "admission_sections", "why_choose_vsu")
)

// ✅ true only when there is a video URL
const hasVideo = computed(() => !!admissionData.value?.videoUrl)

// YouTube embed conversion
function getYoutubeEmbedUrl(url: string): string {
  try {
    const videoId = new URL(url).searchParams.get("v")
    return `https://www.youtube.com/embed/${videoId}`
  } catch (e) {
    console.error("Invalid YouTube URL:", url)
    return ""
  }
}
</script>

<script lang="ts">
definePageMeta({
  layout: "custom",
})
</script>
