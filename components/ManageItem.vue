<!-- components/ManageItem.vue -->
<template>
  <component
    :is="props.view === 'list' ? 'li' : 'div'"
    :class="wrapperClass"
    role="article"
  >
    <!-- FULL-AREA CLICK OVERLAY -->
    <RouterLink
      :to="props.to"
      :aria-label="`Open ${props.title}`"
      class="absolute inset-0 z-10 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon/50 rounded"
      tabindex="0"
    />

    <!-- DELETE -->
    <button
      v-if="props.deletable"
      class="absolute -right-2 -top-2 z-40 rounded-full bg-white/90 p-1 text-gray-500 shadow hover:text-red-600"
      type="button"
      @click.stop="$emit('delete')"
      aria-label="Delete"
      title="Delete"
    >
      <slot name="delete-icon" />
    </button>

    <!-- GRID CONTENT -->
    <template v-if="props.view === 'grid'">
      <img
        v-if="props.image"
        :src="props.image!"
        alt="Cover"
        class="h-48 w-full rounded object-cover"
      />
      <h2 class="mt-2 text-xl font-bold text-maroon">
        {{ props.title }}
      </h2>

      <div class="text-sm text-gray-500 flex items-center gap-2">
        <span v-if="dateText">{{ dateText }}</span>
        <span
          v-if="props.badge"
          class="rounded-full border px-2 py-0.5 text-xs text-gray-600"
        >{{ props.badge }}</span>
        <span
          v-if="props.published === false"
          class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
        >Draft</span>
      </div>

      <p v-if="props.summary" class="mt-1 text-sm text-gray-700">
        {{ props.summary }}
      </p>

      <div class="relative z-40 mt-2">
        <slot name="footer" />
      </div>
    </template>

    <!-- LIST CONTENT -->
    <template v-else>
      <div class="flex items-start gap-4">
        <img
          v-if="props.image"
          :src="props.image!"
          alt="Cover"
          class="h-16 w-24 flex-none rounded object-cover md:h-20 md:w-32"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="truncate text-base font-semibold text-gray-900">
              {{ props.title }}
            </h3>
            <span
              v-if="props.badge"
              class="rounded-full border px-2 py-0.5 text-xs text-gray-600"
            >{{ props.badge }}</span>
            <span
              v-if="props.published === false"
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
            >Draft</span>
          </div>
          <div class="mt-0.5 text-xs text-gray-500">
            <span v-if="dateText">{{ dateText }}</span>
          </div>
          <p v-if="props.summary" class="mt-2 line-clamp-2 text-sm text-gray-700">
            {{ props.summary }}
          </p>
        </div>

        <div class="relative z-40 flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <slot name="row-actions" />
        </div>
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

type View = 'grid' | 'list'
interface Props {
  view: View
  to: string
  title: string
  date?: unknown
  image?: string | null
  summary?: string
  badge?: string
  published?: boolean
  deletable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  view: 'grid',
  image: null,
  summary: '',
  badge: '',
  published: undefined,
  deletable: true,
})

defineEmits<{ (e: 'delete'): void }>()

/* Hover effects:
   - Grid: subtle lift + scale, stronger shadow
   - List: soft bg + tiny scale (md+) so rows don’t jump
*/
const wrapperClass = computed(() => {
  if (props.view === 'grid') {
    return [
      'relative cursor-pointer space-y-2 rounded border bg-white p-4 pt-8 shadow',
      'transition-all duration-200 ease-out transform-gpu will-change-transform',
      'hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-lg hover:ring-1 hover:ring-maroon/15',
      'motion-reduce:transition-none motion-reduce:hover:transform-none',
    ].join(' ')
  }
  return [
    'relative cursor-pointer rounded-xl border bg-white p-4 shadow-sm',
    'transition-all duration-200 ease-out transform-gpu will-change-transform',
    'hover:bg-gray-50 hover:shadow-md md:hover:scale-[1.005] hover:ring-1 hover:ring-maroon/10',
    'motion-reduce:transition-none motion-reduce:hover:transform-none',
  ].join(' ')
})

const dateText = computed(() => {
  const v: any = props.date
  if (!v) return ''
  try {
    const d: Date = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return String(v ?? '')
  }
})
</script>

<style scoped>
.text-maroon { color: #740505; }
</style>
