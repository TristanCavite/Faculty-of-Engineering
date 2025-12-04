<!-- components/UiLoadingOverlay.vue -->
<template>
  <Transition name="fade">
    <div
      v-if="show"
      :class="wrapperClass"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="flex flex-col items-center gap-3">
        <img
          :src="logo"
          alt="Loading"
          class="animate-spin-slow h-20 w-20 select-none"
          draggable="false"
        />
        <p class="font-semibold text-maroon">{{ label }}</p>

        <span class="sr-only">Loading…</span>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    label?: string
    /** Path to your logo inside /public (e.g., '/logo.jpg' or '/logo.svg') */
    logo?: string
    /** Use as small inline overlay instead of full-screen */
    inline?: boolean
  }>(),
  {
    label: 'Loading…',
    logo: '/logoTab.png',
    inline: false,
  },
)

const wrapperClass = computed(() =>
  props.inline
    ? 'absolute inset-0 z-20 grid place-items-center bg-white/60'
    : 'fixed inset-0 z-[100] grid place-items-center bg-transparent',
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin 2.2s linear infinite;
  transform-origin: center center;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin-slow {
    animation: none !important;
  }
}
</style>
