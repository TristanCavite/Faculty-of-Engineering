<template>
  <div
    v-if="oldEvents.length"
    class="pb-6 border bg-neutral-50 rounded-xl"
  >
    <!-- Header -->
    <div class="pt-4 pb-4 mx-auto text-white bg-red-900 rounded-t">
        <div class="flex items-center justify-center text-lg font-semibold">
            <!-- <Clock class="font-bold size-10 " /> -->
            <span class="ml-2 text-3xl font-semibold font-montserrat">More Events</span>
        </div>
    </div>

    <!-- Old events list -->
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
        See all events →
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Timestamp } from 'firebase/firestore'
import { Clock, ChevronRight } from 'lucide-vue-next'

type EventDate = Timestamp | Date | string | number | null | undefined

export interface EventRecord {
  id: string
  title: string
  createdAt?: EventDate
  date?: EventDate
  // other event fields are allowed but not required
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    events: EventRecord[]
    maxVisible?: number
    maxOldEvents?: number
  }>(),
  {
    maxVisible: 3,
    maxOldEvents: 10,
  },
)

const router = useRouter()

function msFrom(value: EventDate): number {
  if (!value && value !== 0) return 0

  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') return new Date(value).getTime()

  // Firestore Timestamp support
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as Timestamp).toDate().getTime()
  }

  return 0
}

const sortedByDateDesc = computed(() =>
  [...props.events].sort(
    (a, b) =>
      msFrom(b.createdAt ?? b.date) - msFrom(a.createdAt ?? a.date),
  ),
)

const oldEvents = computed(() =>
  sortedByDateDesc.value
    .slice(props.maxVisible) // skip the main visible events
    .slice() // copy
    .sort(
      (a, b) =>
        msFrom(b.createdAt ?? b.date) - msFrom(a.createdAt ?? a.date),
    )
    .slice(0, props.maxOldEvents),
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
  router.push(`/events/${id}`)
}

function goToMore() {
  router.push('/events/moreEvents')
}
</script>
<style>
/* * {
  outline: 1px solid red;
} */
</style>