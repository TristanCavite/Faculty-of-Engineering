<template>
  <main class="bg-white">
    <!-- Cover -->
    <div class="relative flex items-center w-full font-playfair">
      <img src="/images/cet.jpg" alt="Research Cover" class="object-cover w-full h-44 md:h-128" />
      <div
        class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-red-900/80"
      >
        <span class="text-xl text-white md:text-6xl">Research</span>
      </div>
    </div>

    <div class="mx-auto mt-8 text-center md:mb-8">
      <span
        class="text-2xl font-extrabold tracking-wide text-red-900 uppercase font-playfair md:text-5xl"
      >
        RESEARCH PUBLICATIONS
      </span>
    </div>

    <!-- Filters -->
    <div class="flex flex-row gap-4 mt-4 ml-4 md:ml-44">
      <!-- Year -->
       <YearFilter
        v-model="selectedYear"
        :years="years"
        :icon="ListFilter"

      />

      <!-- Department -->
      <UiDropdownMenu>
        <UiDropdownMenuTrigger
          class="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-md shadow-sm hover:bg-gray-100"
          aria-label="Filter research"
          type="button"
        >
          <ListFilter class="w-4 h-4 text-red-900" />
          <span class="whitespace-nowrap">{{ selectedDeptLabel }}</span>
        </UiDropdownMenuTrigger>

        <UiDropdownMenuContent class="absolute z-10 mt-2 overflow-auto -right-12 w-44 max-h-72">
          <UiDropdownMenuItem
            class="px-4 py-2 border-b cursor-pointer hover:bg-gray-100"
            @select="selectDepartment('')"
          >
            All Departments
          </UiDropdownMenuItem>
          <UiDropdownMenuItem
            v-for="dept in departments"
            :key="dept.id"
            class="px-4 py-2 border-b cursor-pointer hover:bg-gray-100"
            @select="selectDepartment(dept.id)"
          >
            {{ dept.name }}
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </div>

    <!-- One-column list -->
    <section class="py-5 mx-auto md:max-w-7xl md:px-4">
      <div v-if="filteredResearches.length" class="grid grid-cols-1 gap-10 md:grid-cols-[1fr_420px] md:items-start">
        <!-- LEFT SIDE -->
        <EventsList
          :events="visibleResearches"
          collection-name="researches"
          item-type="research"
          primary-date-field="date"
          type-field=""
          date-label="RESEARCH DATE"
          :search-text="''"
          :max-visible="4"               
          :item-route-base="'/research'"
          :see-all-route="'/research/moreResearch'"
        />

        <!-- RIGHT SIDE -->
        <MoreEvents
          class="self-start hidden md:block"
          see-all-label="See all research publications"
          :items="recentResearches"
          :max-old-items="10"
          :see-all-route="'/research/moreResearch'"
          :item-route-base="'/research'"
        />
      </div>

      <div v-else class="mt-10 text-center text-gray-500">
        No research publications found for the selected filters.
      </div>

      <div class="mt-5 text-center md:hidden">
        <UiButton
          @click="goToAllResearch"
          class="text-base font-semibold text-red-900 bg-transparent hover:bg-transparent"
        >
          See all events...
        </UiButton>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'custom' })

import { ListFilter } from 'lucide-vue-next'
import { onMounted, ref, computed } from 'vue'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { useRouter } from 'vue-router'

const db = useFirestore()
const router = useRouter()

/* Data */
const researches = ref<any[]>([])
const departments = ref<{ id: string; name: string }[]>([])
const deptNameMap = ref<Record<string, string>>({})

/* Filters */
const selectedDeptId = ref<string>('')      // '' = All
const selectedYear = ref<string>('all')     // 'all' = All Years

/* Labels */
const selectedDeptLabel = computed(() => {
  if (!selectedDeptId.value) return 'Department'
  return deptNameMap.value[selectedDeptId.value] || 'Department'
})

/* Years derived from data (all researches, can leave as-is) */
const years = computed<number[]>(() => {
  const set = new Set<number>()

  for (const r of researches.value) {
    if (r.date) {
      const dateValue =
        typeof r.date?.toDate === 'function' ? r.date.toDate() : new Date(r.date)
      const y = dateValue.getFullYear()
      if (!isNaN(y)) set.add(y)
    }
  }

  return Array.from(set).sort((a, b) => b - a)
})

/* Filtering: only status === 'published', then year + department */
const filteredResearches = computed(() => {
  const normalizeStatus = (val: any) =>
    String(val || '').toLowerCase().trim()

  return researches.value.filter((r) => {
    // 1) status filter
    const isPublished = normalizeStatus(r.status) === 'published'
    if (!isPublished) return false

    // 2) year filter
    let yearOfItem: number | null = null

    if (r.date) {
      const dateValue =
        typeof r.date?.toDate === 'function' ? r.date.toDate() : new Date(r.date)
      const y = dateValue.getFullYear()
      if (!isNaN(y)) yearOfItem = y
    }

    const matchYear =
      selectedYear.value === 'all' ||
      (yearOfItem !== null && yearOfItem === Number(selectedYear.value))

    // 3) department filter
    const matchDept =
      !selectedDeptId.value || r.departmentId === selectedDeptId.value

    return matchYear && matchDept
  })
})

/**
 * LEFT SIDE: main list = latest 4 published after filters.
 * researches are already loaded with `orderBy('date', 'desc')`,
 * so this slice keeps "latest first".
 */
const visibleResearches = computed(() =>
  filteredResearches.value.slice(0, 4),
)

/**
 * RIGHT SIDE: recents = remaining published after the first 4.
 * Also limited to 10 for the sidebar.
 */
const recentResearches = computed(() =>
  filteredResearches.value.slice(4, 4 + 10),
)


/* Load data */
onMounted(async () => {
  const snap = await getDocs(
    query(collection(db, 'researches'), orderBy('date', 'desc')),
  )

  researches.value = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  const dSnap = await getDocs(collection(db, 'departments'))
  const map: Record<string, string> = {}

  departments.value = dSnap.docs.map((d) => {
    const data: any = d.data()
    let name = data?.name ?? data?.departmentName ?? data?.title ?? 'Unnamed Department'

    // Remove "Department of " prefix if it exists
    name = name.replace(/^Department of /i, '')

    map[d.id] = name
    return { id: d.id, name }
  })

  deptNameMap.value = map
})

/* UI handlers */
function selectDepartment(id: string) {
  selectedDeptId.value = id
}

function selectYear(year: string) {
  selectedYear.value = year
}

function goToAllResearch() {
  router.push('/research/moreResearch')
}
</script>


<style scoped>
/* *{
  outline: 1px solid red;
} */
</style>
