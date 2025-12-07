<template>
  <main class="bg-white">
    <!-- Header with dynamic cover image -->
    <div class="relative flex w-full items-center font-playfair">
      <img
        :src="programData?.coverImageUrl || '/images/fallback.jpg'"
        alt="Program Cover"
        class="h-44 w-full object-cover md:h-128"
      />
      <div
        class="absolute left-6 top-16 bg-gray-700/90 px-2 py-2 md:left-[120px] md:top-40 md:px-4 md:py-4"
      >
        <span class="text-xl text-white md:text-6xl">{{ programName }}</span>
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
          v-if="programData?.videoUrl && programData.videoUrl.includes('youtube.com')"
          :src="getYoutubeEmbedUrl(programData.videoUrl)"
          frameborder="0"
          allowfullscreen
          class="object-fit h-56 w-full rounded-md md:h-full"
        ></iframe>

        <!-- Fallback for direct video URLs (e.g., .mp4 from Firebase Storage) -->
        <video
          v-else
          :src="programData?.videoUrl"
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
            v-html="programData?.content"
          ></div>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc } from 'firebase/firestore'
import { ref, onMounted, computed } from 'vue'

definePageMeta({ layout: 'custom' })

const db = useFirestore()
const route = useRoute()
const departmentId = route.params.departmentId as string
const programId = route.params.programId as string

const programData = ref<{ coverImageUrl?: string; content?: string; name?: string; videoUrl?: string } | null>(null)

// Fetch program data from Firestore
onMounted(async () => {
  if (!departmentId || !programId) return

  const docRef = doc(db, `departments/${departmentId}/degreePrograms/${programId}`)
  const snap = await getDoc(docRef)

  if (snap.exists()) {
    programData.value = snap.data()
  }
})

// Computed to get the name of the degree program
const programName = computed(() => programData.value?.name || "Degree Program")

// ✅ true only when there is a video URL
const hasVideo = computed(() => !!programData.value?.videoUrl)

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

<style scoped>
.text-maroon {
  color: #740505;
}
</style>
