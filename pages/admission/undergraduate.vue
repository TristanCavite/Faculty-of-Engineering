<template>
  <!-- Render only when visible; otherwise we already threw 404 -->
  <main v-if="visible" class="bg-white pb-4">
    <!-- Header with dynamic cover image -->
    <div class="relative flex w-full items-center font-playfair">
      <img
        :src="admissionData?.coverImageUrl || '/images/fallback.jpg'"
        alt="Undergraduate Cover"
        class="h-44 w-full object-cover md:h-128"
      />
      <div
        class="absolute left-6 top-16 bg-gray-700/90 px-2 py-2 md:left-[120px] md:top-40 md:px-4 md:py-4"
      >
        <span class="text-xl text-white md:text-6xl">Undergraduate</span>
      </div>
    </div>

    <!-- Main Content Container (same layout as faculty / why_choose_vsu) -->
    <div class="mx-auto mt-10 h-auto w-full md:w-3/4 space-y-6 md:space-y-8">
      <!-- ✅ Optional video section -->
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
/**
 * Public Undergraduate page
 * - Reads a public flag from settings/public_flags.admissionUndergradVisible
 * - If the flag is false, immediately throws a 404 (no content fetch)
 * - If true, fetches admission_sections/undergraduate and renders it
 */
import { computed, shallowRef, watchEffect } from 'vue'
import { createError } from 'h3'
import { useFirestore } from 'vuefire'
import { doc, getDoc } from 'firebase/firestore'

definePageMeta({ layout: 'custom' })

const db = useFirestore()

/* 1) Read the public flag (reactive, tiny doc everyone can read) */
const flagsRef = doc(db, 'settings', 'public_flags')
const { data: flags } = useDocument<{ admissionUndergradVisible?: boolean }>(
  flagsRef
)

/* Default to true until the flag arrives (prevents flicker) */
const visible = computed(() => flags.value?.admissionUndergradVisible ?? true)

/* 2) If hidden, throw 404 as soon as the flag is known */
watchEffect(() => {
  if (flags.value && visible.value === false) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }
})

/* 3) Only fetch the content when visible to avoid Firestore rule errors */
const admissionData = shallowRef<any>(null)
const sectionRef = doc(db, 'admission_sections', 'undergraduate')

watchEffect(async () => {
  if (visible.value) {
    const snap = await getDoc(sectionRef)
    admissionData.value = snap.exists() ? snap.data() : null
  } else {
    admissionData.value = null
  }
})

/* ✅ Same helpers as faculty / why_choose_vsu */

const hasVideo = computed(() => !!admissionData.value?.videoUrl)

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
