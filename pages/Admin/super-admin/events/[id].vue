<template>
  <div class="mx-auto max-w-6xl px-4 py-10">
    <div class="mb-6 flex items-center gap-4">
      <UiButton
        type="button"
        class="btn-outline-maroon"
        @click="goBack"
      >
        <template #icon>
          <ArrowLeft class="h-4 w-4" />
        </template>
        Back to Events
      </UiButton>

      <UiButton
        v-if="status === 'published'"
        type="button"
        class="bg-maroon text-white hover:opacity-90"
        :disabled="busy"
        @click="unpublish"
      >
        {{ busy ? 'Unpublishing…' : 'Unpublish' }}
      </UiButton>

      <UiButton
        v-else-if="status === 'pending'"
        type="button"
        class="bg-maroon text-white hover:opacity-90"
        :disabled="busy"
        @click="publish"
      >
        {{ busy ? 'Publishing…' : 'Publish' }}
      </UiButton>

      <UiButton
        v-else
        type="button"
        class="bg-maroon text-white hover:opacity-90"
        @click="editEvent"
      >
        <template #icon>
          <Pen class="h-4 w-4" />
        </template>
        Edit
      </UiButton>
    </div>

    <div v-if="event">
      <h1 class="mb-2 text-3xl font-bold text-maroon">{{ event.title }}</h1>
      <p class="mb-6 text-sm text-gray-600">{{ formatDate(event.date) }}</p>

      <div v-if="coverImages.length" class="relative mb-8 overflow-hidden rounded-xl">
        <div
          class="flex transition-transform duration-700 ease-in-out"
          :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
        >
          <div
            v-for="(img, i) in coverImages"
            :key="i"
            class="h-[400px] w-full flex-shrink-0"
          >
            <img :src="img" class="h-full w-full object-cover" :alt="`Slide ${i+1}`" />
          </div>
        </div>

        <button
          class="absolute left-4 top-1/2 z-10 -translate-y-1/2 transform rounded-full bg-white/80 p-2 shadow hover:bg-white"
          @click="prevSlide"
        >
          <ChevronLeft class="h-6 w-6 text-maroon" />
        </button>
        <button
          class="absolute right-4 top-1/2 z-10 -translate-y-1/2 transform rounded-full bg-white/80 p-2 shadow hover:bg-white"
          @click="nextSlide"
        >
          <ChevronRight class="h-6 w-6 text-maroon" />
        </button>

        <div class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 transform flex gap-2">
          <span
            v-for="(_, i) in coverImages"
            :key="i"
            class="h-3 w-3 rounded-full"
            :class="currentSlide === i ? 'bg-maroon' : 'bg-gray-300'"
            @click="setSlide(i)"
          />
        </div>
      </div>

      <p class="mb-6 text-lg text-gray-800">{{ event.description }}</p>

      <div
        v-html="event.content"
        class="prose max-w-none prose-img:rounded prose-p:text-justify"
      />
    </div>

    <div v-else class="mt-20 text-center text-gray-500">Loading event...</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ArrowLeft, Pen, ChevronRight, ChevronLeft } from 'lucide-vue-next'

const db = useFirestore()
const route = useRoute()
const router = useRouter()

const event = ref<any>(null)
const coverImages = ref<string[]>([])
const currentSlide = ref(0)
const busy = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

async function loadEvent() {
  const id = route.params.id as string
  const snap = await getDoc(doc(db, 'events', id))
  if (snap.exists()) {
    event.value = snap.data()
    coverImages.value = event.value.coverImages || []
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

function nextSlide() {
  if (!coverImages.value.length) return
  currentSlide.value = (currentSlide.value + 1) % coverImages.value.length
}
function prevSlide() {
  if (!coverImages.value.length) return
  currentSlide.value = (currentSlide.value - 1 + coverImages.value.length) % coverImages.value.length
}
function setSlide(i: number) {
  currentSlide.value = i
}

function goBack() {
  router.push('/admin/super-admin/events')
}
function editEvent() {
  router.push({ path: '/admin/super-admin/events/add_event', query: { id: route.params.id as string } })
}

function getStatusFromEvent(e: any): 'published' | 'pending' | 'draft' {
  if (!e) return 'draft'
  const raw = typeof e.status === 'string' ? e.status.toLowerCase() : ''
  if (raw === 'published' || raw === 'pending' || raw === 'draft') return raw as any
  return e.published === true ? 'published' : 'draft'
}

const status = computed(() => getStatusFromEvent(event.value))

async function unpublish() {
  if (!event.value || busy.value) return
  busy.value = true
  try {
    const id = route.params.id as string
    await updateDoc(doc(db, 'events', id), {
      status: 'draft',
      published: false,
      publishedAt: null,
      updatedAt: serverTimestamp(),
    })
    event.value.status = 'draft'
    event.value.published = false
    event.value.publishedAt = null
  } catch (e) {
    console.error(e)
    alert('Failed to unpublish. Please try again.')
  } finally {
    busy.value = false
  }
}

async function publish() {
  if (!event.value || busy.value) return
  busy.value = true
  try {
    const id = route.params.id as string
    await updateDoc(doc(db, 'events', id), {
      status: 'published',
      published: true,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    event.value.status = 'published'
    event.value.published = true
    event.value.publishedAt = new Date().toISOString()
  } catch (e) {
    console.error(e)
    alert('Failed to publish. Please try again.')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadEvent()
  intervalId = setInterval(nextSlide, 4000)
})
onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
.border-maroon {
  border-color: #740505;
}
:deep(.btn-outline-maroon) {
  background-color: #ffffff;
  border: 1px solid #740505;
  color: #740505;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:deep(.btn-outline-maroon:hover) {
  background-color: #740505;
  color: #ffffff !important;
}
</style>
