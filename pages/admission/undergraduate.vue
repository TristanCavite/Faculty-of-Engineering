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

    <!-- Main Content Container -->
     <div class="mx-auto mb-12 mt-10 w-3/4 md:mt-16">
        <div class="cet-content prose max-w-none" v-html="admissionData?.content"></div>
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
import { useFirestore, useDocument } from 'vuefire'
import { doc, getDoc } from 'firebase/firestore'

definePageMeta({ layout: 'custom' })

const db = useFirestore()

/* 1) Read the public flag (reactive, tiny doc everyone can read) */
const flagsRef = doc(db, 'settings', 'public_flags')
const { data: flags } = useDocument<{ admissionUndergradVisible?: boolean }>(flagsRef)

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
</script>
