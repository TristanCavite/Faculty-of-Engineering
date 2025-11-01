<template>
  <main class="bg-white pb-4">
    <!-- Header with dynamic cover image -->
    <div class="relative flex w-full items-center font-playfair">
      <img
        :src="obeData?.coverImageUrl || '/images/fallback.jpg'"
        alt="OBE Cover"
        class="h-44 w-full object-cover md:h-128"
      />
      <div
        class="absolute left-6 top-16 bg-gray-700/90 px-2 py-2 md:left-[120px] md:top-40 md:px-4 md:py-4"
      >
        <span class="text-xl text-white md:text-6xl">Outcome-Based Education</span>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="mx-auto mb-12 mt-10 w-3/4 md:mt-16">
      <div class="cet-content prose max-w-none" v-html="obeData?.content"></div>
    </div>
  </main>
</template>

<script setup lang="ts">
  /**
   * Public OBE Page
   * - Always visible (no flag like undergrad/admission)
   * - Fetches Firestore doc `obe_page/main`
   */
  import { doc, getDoc } from "firebase/firestore";
  import { onMounted, shallowRef } from "vue";
  import { useFirestore } from "vuefire";

  definePageMeta({ layout: "custom" });

  const db = useFirestore();

  /* Local state for OBE content */
  const obeData = shallowRef<any>(null);

  onMounted(async () => {
    const snap = await getDoc(doc(db, "obe_page", "main"));
    obeData.value = snap.exists() ? snap.data() : null;
  });
</script>
