<template>
  <main class="bg-white">
    <!-- Cover -->
    <div class="relative flex items-center w-full font-playfair">
      <img src="/images/cet.jpg" alt="Research Cover" class="object-cover w-full h-44 md:h-128" />
      <div
        class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90"
      >
        <span class="text-xl text-white md:text-6xl">Research</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex justify-end max-w-6xl gap-4 px-4 mx-auto mt-4">
      <!-- Year -->
      <div class="relative" @click.stop="toggleYear">
        <div class="flex items-center justify-center h-8 gap-1 font-semibold bg-white border border-gray-500 rounded cursor-pointer w-28">
          <span class="text-sm text-gray-700">{{ selectedYearLabel }}</span>
          <ChevronDown class="w-4 h-4 text-black" />
        </div>
        <div v-if="showYears" class="absolute z-20 mt-2 overflow-auto bg-white border rounded-md shadow max-h-72 w-36 ">
          <ul>
            <li class="px-4 py-2 cursor-pointer hover:bg-gray-100" @click.stop="selectYear('')">All Years</li>
            <li
              v-for="year in years"
              :key="year"
              class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              @click.stop="selectYear(String(year))"
            >
              {{ year }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Department -->
      <div class="relative" @click.stop="toggleDepartments">
        <div class="flex items-center justify-center w-40 h-8 gap-1 font-semibold bg-white border border-gray-500 rounded cursor-pointer">
          <span class="text-sm text-gray-700 truncate">{{ selectedDeptLabel }}</span>
          <ChevronDown class="w-4 h-4 text-black" />
        </div>
        <div
          v-if="showDepartments"
          class="absolute z-20 w-64 mt-2 overflow-auto bg-white border rounded-md shadow max-h-72"
        >
          <ul>
            <li class="px-4 py-2 cursor-pointer hover:bg-gray-100" @click.stop="selectDepartment('')">
              All Departments
            </li>
            <li
              v-for="dept in departments"
              :key="dept.id"
              class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              @click.stop="selectDepartment(dept.id)"
            >
              {{ dept.name }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- One-column list -->
    <section class="max-w-4xl px-4 mx-auto mt-6 mb-2">
      <div v-if="filteredResearches.length" class="space-y-6">
        <article
          v-for="item in filteredResearches"
          :key="item.id"
          class="p-4 transition bg-white border shadow-xl rounded-xl"
        >
          <!-- Title -->
          <NuxtLink :to="`/research/${item.id}`" class="block">
            <h2 class="text-lg font-semibold text-maroon hover:underline">
              {{ item.title }}
            </h2>
          </NuxtLink>

          <!-- Meta -->
          <div class="flex flex-wrap items-center mt-1 text-xs text-gray-600 gap-x-2 gap-y-1">
            <span>{{ formatDate(item.date) }}</span>

            <template v-if="departmentName(item.departmentId)">
              <span class="text-gray-400">•</span>
              <span>Dept: {{ departmentName(item.departmentId) }}</span>
            </template>

            <template v-if="item.researchers">
              <span class="text-gray-400">•</span>
              <span>Researchers: {{ item.researchers }}</span>
            </template>
          </div>

          <!-- Cover -->
          <NuxtLink :to="`/research/${item.id}`" class="block">
            <img
              v-if="item.coverImages?.length"
              :src="item.coverImages[0]"
              alt="Cover"
              class="object-contain w-full mt-3 bg-white rounded max-h-96"
              loading="lazy"
            />
          </NuxtLink>


          <!-- Description -->
          <p class="mt-3 text-sm text-gray-700">
            {{ item.description }}
          </p>

          <!-- Read more -->
          <div class="flex justify-between mt-4">
            <UiButton
              @click="readMore(item.id)"
              class="inline-block px-2 py-1 text-xs font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300"
            >
              Read more…
            </UiButton>
            <ShareButton v-for="r in filteredResearches" :key="r.id" :item="{ id:r.id, type:'research', slug:r.slug, title:r.title, excerpt:r.description }" />
          </div>
        </article>
      </div>

      <div v-else class="p-8 text-center text-gray-500 bg-white border rounded">
        No research found for the selected filter(s).
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import ChevronDown from '@/components/Icons/ChevronDown.vue'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { collection, getDocs, orderBy, query, QueryDocumentSnapshot } from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { useRouter } from 'vue-router'

const db = useFirestore()
const router = useRouter()

/* Data */
const researches = ref<any[]>([])
const departments = ref<{ id: string; name: string }[]>([])
const deptNameMap = ref<Record<string, string>>({})

/* Filters */
const showDepartments = ref(false)
const showYears = ref(false)
const selectedDeptId = ref<string>('')  // '' = All
const selectedYear = ref<string>('')    // '' = All

/* Labels */
const selectedDeptLabel = computed(() => {
  if (!selectedDeptId.value) return 'Department'
  return deptNameMap.value[selectedDeptId.value] || 'Department'
})
const selectedYearLabel = computed(() => (selectedYear.value ? selectedYear.value : 'Year'))

/* Years derived from data */
const years = computed<number[]>(() => {
  const set = new Set<number>()
  for (const r of researches.value) {
    if (r.date) {
      const y = new Date(r.date).getFullYear()
      if (!isNaN(y)) set.add(y)
    }
  }
  return Array.from(set).sort((a, b) => b - a)
})

/* Filtering */
const filteredResearches = computed(() => {
  return researches.value.filter((r) => {
    const y = r.date ? new Date(r.date).getFullYear() : null
    const matchYear = !selectedYear.value || y === parseInt(selectedYear.value)
    const matchDept = !selectedDeptId.value || r.departmentId === selectedDeptId.value
    return matchYear && matchDept
  })
})

/* Utils */
function departmentName(id?: string) {
  return (id && deptNameMap.value[id]) || ''
}
function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/* Load data */
onMounted(async () => {
  const rSnap = await getDocs(query(collection(db, 'researches'), orderBy('date', 'desc')))
  researches.value = rSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...d.data(),
  }))

  const dSnap = await getDocs(collection(db, 'departments'))
  const map: Record<string, string> = {}
  departments.value = dSnap.docs.map((d) => {
    const data: any = d.data()
    const name = data?.name ?? data?.departmentName ?? data?.title ?? 'Unnamed Department'
    map[d.id] = name
    return { id: d.id, name }
  })
  deptNameMap.value = map

  window.addEventListener('click', closeDropdowns)
})
onUnmounted(() => {
  window.removeEventListener('click', closeDropdowns)
})

function closeDropdowns() {
  showDepartments.value = false
  showYears.value = false
}

/* UI */
function toggleDepartments() {
  showDepartments.value = !showDepartments.value
  showYears.value = false
}
function toggleYear() {
  showYears.value = !showYears.value
  showDepartments.value = false
}
function selectDepartment(id: string) {
  selectedDeptId.value = id
  showDepartments.value = false
}
function selectYear(year: string) {
  selectedYear.value = year
  showYears.value = false
}

function readMore(id: string) {
  router.push(`/research/${id}`)
}
</script>

<style scoped>
.text-maroon { color: #740505; }
.bg-maroon { background-color: #740505; }
.border-maroon { border-color: #740505; }
</style>
