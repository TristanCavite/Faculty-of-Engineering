<template>
  <div class="max-w-6xl mx-auto px-4 py-10">
    <!-- Top buttons (LEFT) -->
    <div class="mb-6 flex justify-start gap-4">
      <UiButton
        type="button"
        class="btn-outline-maroon"
        @click="goBack"
      >
        <template #icon>
          <ArrowLeft class="w-4 h-4" />
        </template>
        Back to Research
      </UiButton>

      <UiButton
        v-if="status === 'draft'"
        type="button"
        class="bg-maroon text-white hover:opacity-90"
        @click="editResearch"
      >
        <template #icon>
          <Pen class="w-4 h-4" />
        </template>
        Edit
      </UiButton>
    </div>

    <!-- Research Content -->
    <div v-if="research">
      <!-- Title -->
      <h1 class="mb-2 text-3xl font-bold text-maroon">{{ research.title }}</h1>

      <!-- Meta -->
      <div class="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
        <span>{{ formatDate(research.date) }}</span>

        <template v-if="deptName">
          <span class="text-gray-400">•</span>
          <span>
            <span class="font-medium text-gray-700">Department:</span> {{ deptName }}
          </span>
        </template>

        <template v-if="research.researchers">
          <span class="text-gray-400">•</span>
          <span>
            <span class="font-medium text-gray-700">Researchers:</span>
            {{ research.researchers }}
          </span>
        </template>
      </div>

      <!-- Carousel -->
      <div v-if="coverImages.length" class="relative mb-8 overflow-hidden rounded-xl">
        <div
          class="flex transition-transform duration-700 ease-in-out"
          :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
        >
          <div
            v-for="(img, index) in coverImages"
            :key="index"
            class="h-[400px] w-full flex-shrink-0"
          >
            <img
              :src="img"
              class="h-full w-full object-cover"
              :alt="`Slide ${index + 1}`"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Arrows -->
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

        <!-- Dots -->
        <div class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 transform flex gap-2">
          <span
            v-for="(_, index) in coverImages"
            :key="index"
            class="h-3 w-3 rounded-full"
            :class="currentSlide === index ? 'bg-maroon' : 'bg-gray-300'"
            @click="setSlide(index)"
          />
        </div>
      </div>

      <!-- Description -->
      <p class="mb-6 text-lg text-gray-800">{{ research.description }}</p>

      <!-- Rich Content -->
      <div
        v-html="research.content"
        class="prose max-w-none prose-img:rounded prose-p:text-justify"
      />
    </div>

    <div v-else class="mt-20 text-center text-gray-500">Loading research...</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  roles: ['head_admin'],
  layout: 'head-admin',
})

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc } from 'firebase/firestore'
import { ArrowLeft, Pen, ChevronRight, ChevronLeft } from 'lucide-vue-next'

const db = useFirestore()
const route = useRoute()
const router = useRouter()

type Status = 'draft' | 'pending' | 'published'

const research = ref<any>(null)
const coverImages = ref<string[]>([])
const currentSlide = ref(0)
const deptName = ref<string>('')
let intervalId: ReturnType<typeof setInterval> | null = null

async function loadDepartmentName(departmentId?: string) {
  if (!departmentId) return
  const snap = await getDoc(doc(db, 'departments', departmentId))
  if (snap.exists()) {
    const data: any = snap.data()
    deptName.value =
      data?.name ?? data?.departmentName ?? data?.title ?? ''
  }
}

async function loadResearch() {
  const id = route.params.id as string
  const snap = await getDoc(doc(db, 'researches', id))
  if (snap.exists()) {
    research.value = snap.data()
    coverImages.value = research.value.coverImages || []
    await loadDepartmentName(research.value.departmentId)
  }
}

/** Canonical status of this research */
const status = computed<Status>(() => {
  const r = research.value
  if (!r) return 'draft'
  const raw = typeof r.status === 'string' ? r.status.toLowerCase() : ''
  if (raw === 'draft' || raw === 'pending' || raw === 'published') {
    return raw as Status
  }
  // fallback for old docs that only have `published` boolean
  return r.published === true ? 'published' : 'draft'
})

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

function nextSlide() {
  if (coverImages.value.length) {
    currentSlide.value = (currentSlide.value + 1) % coverImages.value.length
  }
}
function prevSlide() {
  if (coverImages.value.length) {
    currentSlide.value =
      (currentSlide.value - 1 + coverImages.value.length) %
      coverImages.value.length
  }
}
function setSlide(i: number) {
  currentSlide.value = i
}

function goBack() {
  router.push('/admin/head-admin/research')
}
function editResearch() {
  router.push({
    path: '/admin/head-admin/research/add_research',
    query: { id: route.params.id as string },
  })
}

onMounted(() => {
  loadResearch()
  intervalId = setInterval(nextSlide, 4000)
})
onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.text-maroon { color: #740505; }
.bg-maroon { background-color: #740505; }

/* Outline pill that flips to maroon with white text on hover */
.btn-outline-maroon {
  background-color: #ffffff;
  border: 1px solid #740505;
  color: #740505;
  transition: background-color .15s, color .15s, border-color .15s;
}
.btn-outline-maroon:hover {
  background-color: #740505;
  color: #ffffff !important;
}
</style>
