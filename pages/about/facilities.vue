<template>
  <main class="bg-white">
    <!-- Banner -->
    <div class="relative flex items-center w-full font-playfair">
      <img :src="section?.coverImageUrl || '/images/cet_facilities.jpg'" alt="Facilities Banner" class="object-cover w-full h-44 md:h-128" />
      <div class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90">
        <span class="text-xl text-white md:text-6xl">Facilities</span>
      </div>
    </div>

      <div class="mx-auto mb-12 mt-10 w-3/4 md:mt-16">
        <div class="cet-content prose max-w-none" v-html="section?.content"></div>
      </div>
  </main>
</template>

<script setup lang="ts">
import { doc } from 'firebase/firestore'
import { useDocument } from 'vuefire'
import { useFirestore } from 'vuefire'

definePageMeta({
  layout: 'custom',
})

const db = useFirestore()
const { data: section, pending } = useDocument(
  doc(db, 'about_sections', 'facilities')
)
</script>
