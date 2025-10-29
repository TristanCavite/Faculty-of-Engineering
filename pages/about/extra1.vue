<template>
  <main class="bg-white">
    <!-- ▸ Hero with dynamic cover image from Firestore -->
    <div class="relative flex items-center w-full font-playfair ">
      <img
        :src="coverImage"
        :alt="`${pageTitle} cover`"
        class="object-cover w-full h-44 md:h-128"
      />

      <!-- Title overlay: follows history design -->
      <div class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90">
        <span class="text-xl text-white md:text-6xl">{{ pageTitle }}</span>
      </div>
    </div>

    <!-- ▸ Content card -->
    <div class="p-10 mx-auto md:w-3/4">
      <div
        class="leading-relaxed prose max-w-none"
        v-html="contentHtml"
      />

      <div v-if="!contentHtml" class="m-5">
        Loading…
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { computed } from 'vue'
import { doc } from 'firebase/firestore'
import { useFirestore, useDocument } from 'vuefire'

// Firestore + reactive document for extra_section_1
const db = useFirestore()
const docRef = doc(db, 'about_sections', 'extra_section_1')
const docSnap = useDocument(docRef)

// Fallback cover image (adjust path if needed)
const FALLBACK = '/images/default_about_cover.jpg'

// page title: use admin-saved title if present, else friendly fallback
const pageTitle = computed(() => {
  const t = docSnap.value?.title
  return t && String(t).trim().length ? t : 'Extra Section'
})

// cover image: prefer stored coverImageUrl, else fallback
const coverImage = computed(() => docSnap.value?.coverImageUrl || FALLBACK)

// content HTML saved by admin (render raw as in history.vue)
const contentHtml = computed(() => docSnap.value?.content || '')
</script>
