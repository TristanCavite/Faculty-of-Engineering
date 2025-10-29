<template>
  <div class="max-w-5xl px-4 pt-5 pb-8 mx-auto md:py-8 md:my-7">
    <h1 class="pb-4 text-2xl font-bold text-red-900 md:pb-8 md:text-5xl font-playfair">Faculty News</h1>

    <!-- News List -->
    <div v-if="newsList?.length" class="space-y-10">
      <div
        v-for="news in newsList"
        :key="news.id"
        class="p-6 space-y-4 bg-white border border-gray-200 shadow-xl rounded-xl"
      >
        <!-- Title -->
        <h2 class="text-2xl font-bold text-maroon">{{ news.title }}</h2>

        <!-- Author and Date -->
        <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span class="inline-flex items-center gap-1">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2"
              viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182l-9.56 9.56a4.5 4.5 0 0 1-1.636.975l-3.15.983.983-3.15a4.5 4.5 0 0 1 .975-1.636l9.206-9.206Z" />
            </svg>
            Written by <span class="font-medium">{{ news.author || 'Unknown' }}</span>
          </span>
          <span class="inline-flex items-center gap-1">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2"
              viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 7V3M16 7V3M4 11h16M5 21h14a2 2 0 0 0 2-2V7H3v12a2 2 0 0 0 2 2Z" />
            </svg>
            Published: {{ formatDate(news.createdAt?.toDate?.()) }}
          </span>
        </div>

        <!-- Cover Image -->
        <img
          v-if="news.imageUrl"
          :src="news.imageUrl"
          class="w-full max-h-[400px] object-cover rounded"
          alt="News Cover Image"
        />

        <!-- Description -->
        <p class="text-justify text-gray-700">{{ news.description }}</p>

        <!-- Read More Button -->
        <div class="flex justify-between pt-2">
          <UiButton
            @click="readMore(news.id)"
            class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300"
          >   
            Read more...
          </UiButton>
          <ShareButton :item="{ id: news.id, type: 'news', title: news.title, excerpt: news.description }"/>
        </div>
      </div>
    </div>
    <!-- No news fallback -->
    <p v-else class="mt-10 text-center text-gray-500">No news found.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { useFirestore, useCollection } from 'vuefire'
import { collection, query, where, orderBy } from 'firebase/firestore'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { UiButton } from '#components'

// Firestore setup
const db = useFirestore()
const newsRef = collection(db, 'news')
const router = useRouter()

// Only show published, sorted by date descending
const newsQuery = query(
  newsRef,
  where('published', '==', true),
  orderBy('createdAt', 'desc')
)

const newsCollection = useCollection(newsQuery)

// Transform documents with ID
const newsList = computed(() =>
  newsCollection.value?.map((doc: any) => ({
    ...doc,
    id: doc.id, // ✅ Correct and reliable
  })) ?? []
)

function readMore(id: string) {
  router.push(`/news/${id}`)
}


function formatDate(date: Date | undefined) {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
</style>
