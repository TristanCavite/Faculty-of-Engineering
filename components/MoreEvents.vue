<template>
  <div class="h-auto pb-6 border bg-neutral-50 rounded-xl">
    <!-- Header -->
    <div class="pt-4 pb-4 mx-auto text-white bg-red-900 rounded-t">
        <div class="flex items-center justify-center text-lg font-semibold">
            <!-- <Clock class="font-bold size-10 " /> -->
            <span class="ml-2 text-3xl font-semibold text-center font-montserrat">Recents</span>
        </div>
    </div>

    <!-- Old events list -->
    <div v-if="oldEvents.length" class="mt-6 ">
      <ul class="pl-6 pr-6 mt-6 space-y-2">
        <li
          v-for="ev in oldEvents"
          :key="ev.id"
          class="border-b"
        >
          <UiButton
            @click="readMore(ev.id)"
            class="text-sm bg-transparent hover:bg-transparent hover:scale-105"
          >
            <span class="w-64 font-medium text-left text-gray-800 truncate hover:text-red-900">
              {{ ev.title }}
            </span>
            <span class="text-gray-500 shrink-0">
              {{ miniDate(ev.createdAt || ev.date) }}
            </span>
          </UiButton>
        </li>
      </ul>
      <!-- See all (desktop) -->
      <div class="hidden mt-4 mr-6 md:flex md:justify-end">
        <UiButton
          @click="goToMore"
          class="text-sm font-semibold text-white bg-red-900 hover:bg-red-950 hover:scale-105"
        >
           {{ props.seeAllLabel }} →
        </UiButton>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="px-6 py-8 text-center text-gray-500">
      <p>No additional items to display</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Timestamp } from 'firebase/firestore'

type EventDate = Timestamp | Date | string | number | null | undefined

export interface EventRecord {
  id: string
  title: string
  createdAt?: EventDate
  date?: EventDate
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    items: EventRecord[]
    maxVisible?: number
    maxOldItems?: number
    headerLabel?: string
    seeAllLabel?: string
    seeAllRoute?: string
    itemRouteBase?: string
    /** 🔹 current type filter coming from index.vue */
    currentType?: string
  }>(),
  {
    maxVisible: 3,
    maxOldItems: 10,
    seeAllLabel: "",
    seeAllRoute: "/events/moreEvents",
    itemRouteBase: "/events",
    currentType: "all",
  },
)

const router = useRouter()

function msFrom(value: EventDate): number {
  if (!value && value !== 0) return 0
  if (typeof value === "number") return value
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") return new Date(value).getTime()

  if (
    typeof value === "object" &&
    value &&
    "toDate" in value &&
    typeof (value as any).toDate === "function"
  ) {
    return (value as Timestamp).toDate().getTime()
  }

  return 0
}

const isPublishedStatus = (value: any) =>
  String(value || "").toLowerCase().trim() === "published"

const sortedByDateDesc = computed(() =>
  [...props.items]
    .filter((item: any) => isPublishedStatus(item.status))
    .sort((a, b) => {
      const aTime = msFrom(a.createdAt ?? a.date)
      const bTime = msFrom(b.createdAt ?? b.date)
      return bTime - aTime   // DESC
    }),
)

const oldEvents = computed(() =>
  sortedByDateDesc.value.slice(0, props.maxOldItems),
)

function miniDate(value: EventDate): string {
  const time = msFrom(value)
  if (!time) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(time))
}

function readMore(id: string) {
  router.push(`${props.itemRouteBase}/${id}`)
}

function goToMore() {
  const type = props.currentType ?? "all"

  if (!props.seeAllRoute) return

  if (type === "all") {
    router.push(props.seeAllRoute)
  } else {
    router.push({
      path: props.seeAllRoute,
      query: { type },
    })
  }
}
</script>


<style>
/* * {
  outline: 1px solid red;
} */
</style>