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
      <!-- If admin marked this section hidden, show a minimal unavailable message -->
      <div v-if="!isVisible" class="text-center py-20">
        <h2 class="text-2xl font-semibold">This page is not available</h2>
        <p class="text-gray-600 mt-2">The content on this page has been hidden by the site administrator.</p>
      </div>

      <!-- Render rich HTML content from Firestore when visible -->
      <div v-else class="leading-relaxed prose max-w-none" v-html="contentHtml" />

      <!-- (Optional) Tiny fallback when not yet loaded and no content -->
      <div v-if="isVisible && !contentHtml" class="m-5">
        Loading…
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
/**
 * pages/about/extra1.vue
 * - Shows the admin-edited Extra Section (about_sections.extra_section_1)
 * - Uses VueFire's useDocument for a reactive doc reference
 * - If admin set isVisible === false, the page displays a not-available message
 */

import { computed } from 'vue'
import { doc } from 'firebase/firestore'
import { useFirestore, useDocument } from 'vuefire'

definePageMeta({ layout: 'custom' })

// Firestore instance via VueFire
const db = useFirestore()

// Reactive document reference for extra_section_1
const docRef = doc(db, 'admission_sections', 'extra_section_1')
const docSnap = useDocument(docRef)

// Friendly fallback cover image when none is stored
const FALLBACK = '/images/default_about_cover.jpg'

// pageTitle: prefer the admin-saved title; fallback to "Extra Section"
const pageTitle = computed(() => {
  const t = docSnap.value?.title
  return t && String(t).trim().length ? String(t) : 'Extra Section'
})

// coverImage: prefer stored coverImageUrl, else fallback
const coverImage = computed(() => docSnap.value?.coverImageUrl || FALLBACK)

// contentHtml: the rich HTML produced by the admin editor
const contentHtml = computed(() => docSnap.value?.content || '')

// isVisible: if explicitly false then treat as hidden (default: visible)
const isVisible = computed(() => {
  // If isVisible === false (explicitly hidden) => false; otherwise true
  return docSnap.value?.isVisible === false ? false : true
})
</script>
