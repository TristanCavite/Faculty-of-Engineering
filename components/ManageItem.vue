<template>
  <!-- Wrapper is <li> in list mode, <div> in grid mode -->
  <component
    :is="view === 'list' ? 'li' : 'div'"
    :class="wrapperClass"
    role="article"
  >
    <!-- ============ SKELETON: JUST A BOX ============ -->
    <template v-if="skeleton">
      <span class="sr-only">Loading…</span>
    </template>

    <!-- ============ NORMAL CONTENT ============ -->
    <template v-else>
      <!-- FULL-AREA CLICK OVERLAY -->
      <RouterLink
        :to="to"
        :aria-label="`Open ${title}`"
        class="absolute inset-0 z-10 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon/50"
        tabindex="0"
      />

      <!-- DELETE BUTTON (X) -->
      <button
        v-if="deletable"
        class="absolute -right-2 -top-2 z-40 rounded-full bg-white/90 p-1 text-gray-500 shadow hover:text-red-600"
        type="button"
        @click.stop="$emit('delete')"
        aria-label="Delete"
        title="Delete"
      >
        <slot name="delete-icon">×</slot>
      </button>

      <!-- ================= GRID VIEW ================= -->
      <template v-if="view === 'grid'">
        <img
          v-if="image"
          :src="image!"
          alt="Cover"
          class="h-48 w-full rounded object-cover"
        />
        <h2 class="mt-2 text-xl font-bold text-maroon">
          {{ title }}
        </h2>

        <div class="mt-1 flex items-center gap-2 text-sm text-gray-500">
          <span v-if="dateText">{{ dateText }}</span>
          <span
            v-if="badge"
            class="rounded-full border px-2 py-0.5 text-xs text-gray-600"
          >
            {{ badge }}
          </span>
          <!-- Correct handling of Draft or Pending -->
          <span
            v-if="status === 'draft'"
            class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
          >
            Draft
          </span>
          <span
            v-if="status === 'pending'"
            class="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
          >
            Pending
          </span>
        </div>

        <p v-if="summary" class="mt-1 text-sm text-gray-700">
          {{ summary }}
        </p>

        <!-- Footer slot for buttons (e.g., "Read more") -->
        <div class="relative z-40 mt-2">
          <slot name="footer" />
        </div>
      </template>

      <!-- ================= LIST VIEW ================= -->
      <template v-else>
        <div class="flex items-start gap-4">
          <img
            v-if="image"
            :src="image!"
            alt="Cover"
            class="h-16 w-24 flex-none rounded object-cover md:h-20 md:w-32"
          />

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="truncate text-base font-semibold text-gray-900">
                {{ title }}
              </h3>
              <span
                v-if="badge"
                class="rounded-full border px-2 py-0.5 text-xs text-gray-600"
              >
                {{ badge }}
              </span>
              <!-- Correct handling of Draft or Pending -->
              <span
                v-if="status === 'draft'"
                class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                Draft
              </span>
              <span
                v-if="status === 'pending'"
                class="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
              >
                Pending
              </span>
            </div>

            <div class="mt-0.5 text-xs text-gray-500">
              <span v-if="dateText">{{ dateText }}</span>
            </div>

            <p v-if="summary" class="mt-2 line-clamp-2 text-sm text-gray-700">
              {{ summary }}
            </p>
          </div>

          <!-- Right-side actions (e.g., edit buttons) in list mode -->
          <div class="relative z-40 hidden shrink-0 sm:flex sm:items-center sm:gap-2">
            <slot name="row-actions" />
          </div>
        </div>
      </template>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

/** Card view type */
type View = 'grid' | 'list'

/** Props for the item card */
interface Props {
  view: View
  to: string
  title: string
  date?: unknown
  image?: string | null
  summary?: string
  badge?: string
  /** If false/undefined, card is considered "published" (no Draft pill). */
  published?: boolean
  status?: 'draft' | 'pending' | 'published' // Added for correct status handling
  /** Controls whether the X delete button is shown. */
  deletable?: boolean
  /** If true, show a single rounded shimmering box (no inner layout). */
  skeleton?: boolean
  /** Optional override for skeleton size classes (e.g., 'h-72'). */
  skeletonBoxClass?: string
}

/**
 * Default props:
 * - deletable: false → by default, no delete button.
 *   Super Admin pages will pass :deletable="true" explicitly.
 */
const props = withDefaults(defineProps<Props>(), {
  view: 'grid',
  image: null,
  summary: '',
  badge: '',
  published: undefined,
  status: 'draft', // Default status
  deletable: false, // 🔴 CHANGED: normal users won’t see X unless explicitly enabled
  skeleton: false,
  skeletonBoxClass: '',
})

/** Emits:
 * - delete: fired when the X button is clicked
 */
defineEmits<{ (e: 'delete'): void }>()

/** Wrapper: normal card vs. just-box skeleton */
const wrapperClass = computed(() => {
  if (props.skeleton) {
    // JUST A BOX with shimmer. No padding/border; rounded container *is* the skeleton.
    const base = [
      'relative overflow-hidden rounded-xl bg-slate-200 skeleton-shimmer',
      props.skeletonBoxClass || (props.view === 'grid' ? 'h-64' : 'h-24'),
      'w-full',
    ]
    return base.join(' ')
  }

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

/** Date formatter used in both views */
const dateText = computed(() => {
  const v: any = props.date
  if (!v) return ''
  try {
    const d: Date = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return String(v ?? '')
  }
})
</script>

<style scoped>
.text-maroon {
  color: #740505;
}

/* Simple shimmer for the solid box (skeleton mode) */
.skeleton-shimmer {
  position: relative;
}
.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.5) 20%,
    rgba(255, 255, 255, 0) 40%
  );
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* Styles for Draft and Pending Labels */
.bg-yellow-100 {
  background-color: #fff3cd;
}
.text-yellow-800 {
  color: #856404;
}
</style>
