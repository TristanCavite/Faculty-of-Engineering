<template>
  <main class="bg-white">
    <!-- Header with dynamic cover image -->
    <div class="relative flex items-center w-full font-playfair">
      <img
        :src="admissionData?.coverImageUrl || '/images/fallback.jpg'"
        alt="Graduate Cover"
        class="object-cover w-full h-44 md:h-128"
      />
      <div class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90">
        <span class="text-xl text-white md:text-6xl">Graduate</span>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="w-3/4 mx-auto mt-10 mb-12 md:mt-16">
      <!-- Rich Text Content -->
       <div class="mx-auto mb-12 mt-10 w-3/4 md:mt-16">
        <div class="cet-content prose max-w-none" v-html="admissionData?.content"></div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useDocument } from 'vuefire'
import { doc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

// Firestore setup
const db = useFirestore()

// Fetch from: admission_sections > graduate
const { data: admissionData } = useDocument(
  doc(db, 'admission_sections', 'graduate')
)
</script>

<script lang="ts">
definePageMeta({
  layout: 'custom',
})
</script>
