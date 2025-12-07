<template>
  <main class="bg-white">
    <!-- Header with dynamic cover image -->
    <div class="relative flex w-full items-center font-playfair">
      <img
        :src="departmentPage?.coverImageUrl || '/images/fallback.jpg'"
        alt="Department Cover"
        class="h-44 w-full object-cover md:h-128"
      />
      <div
        class="absolute left-6 top-16 bg-gray-700/90 px-2 py-2 md:left-[120px] md:top-40 md:px-4 md:py-4"
      >
        <span class="text-xl text-white md:text-6xl">{{ departmentName }}</span>
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
          v-if="departmentPage?.videoUrl && departmentPage.videoUrl.includes('youtube.com')"
          :src="getYoutubeEmbedUrl(departmentPage.videoUrl)"
          frameborder="0"
          allowfullscreen
          class="object-fit h-56 w-full rounded-md md:h-full"
        ></iframe>

        <!-- Fallback for direct video URLs (e.g., .mp4 from Firebase Storage) -->
        <video
          v-else
          :src="departmentPage?.videoUrl"
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
            v-html="departmentPage?.content"
          ></div>
        </div>
      </div>

      <!-- Degree Programs Offered -->
      <div v-if="degreePrograms.length" class="p-6 mt-12">
        <h2 class="text-2xl font-bold text-maroon mb-6 flex items-center gap-2">
          🎓 Degree Programs Offered
        </h2>
        <div class="grid gap-6 md:grid-cols-2">
          <NuxtLink
            v-for="program in degreePrograms"
            :key="program.id"
            :to="`/academics/degree-programs/${departmentId}/${program.id}`"
            class="block p-6 bg-white border rounded-lg shadow-sm transition hover:shadow-lg hover:-translate-y-1"
          >
            <h3 class="text-lg font-semibold text-maroon mb-2">{{ program.name }}</h3>
            <p class="text-sm text-gray-600">Click to view program details</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { useFirestore } from "vuefire";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { ref, onMounted, computed } from "vue";

definePageMeta({ layout: "custom" });

const db = useFirestore();
const route = useRoute();
const departmentId = route.params.id as string;

const departmentPage = ref<{ coverImageUrl?: string; content?: string; videoUrl?: string; name?: string } | null>(null);
const degreePrograms = ref<{ id: string; name: string }[]>([]);

// Fetch data on mounted
onMounted(async () => {
  // Get department page content from department_pages/{departmentId}
  const pageDoc = await getDoc(doc(db, "department_pages", departmentId));
  if (pageDoc.exists()) {
    departmentPage.value = pageDoc.data();
  }

  // Get list of degree programs under departments/{departmentId}/degreePrograms
  const programSnap = await getDocs(collection(db, "departments", departmentId, "degreePrograms"));
  degreePrograms.value = programSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
  }));
});

// Computed to check if videoUrl exists
const hasVideo = computed(() => !!departmentPage.value?.videoUrl);

// Fetch the department name from the data
const departmentName = computed(() => departmentPage.value?.name || "Department of Geodetic Engineering");

// Convert normal YouTube links to embed URL
function getYoutubeEmbedUrl(url: string): string {
  try {
    const videoId = new URL(url).searchParams.get("v");
    return `https://www.youtube.com/embed/${videoId}`;
  } catch (e) {
    console.error("Invalid YouTube URL:", url);
    return "";
  }
}
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
</style>
