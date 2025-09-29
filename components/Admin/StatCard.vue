<template>
  <article class="stat-card group">
    <div class="stat-icon" :class="ring">
      <component :is="icon" class="h-6 w-6" :class="iconColor" />
    </div>

    <h3 class="stat-label">{{ label }}</h3>

    <p class="stat-number" :class="loading && 'animate-pulse'">
      <span v-if="!loading">{{ value?.toLocaleString?.() ?? value }}</span>
      <span v-else>—</span>
    </p>

    <p class="stat-sub">{{ sub }}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  icon: any
  iconColor?: string
  ring?: string
  label: string
  sub?: string
  value: number | string
  loading?: boolean
}>()
</script>

<style scoped lang="postcss">
.stat-card { @apply relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition; }
.stat-card::after { content:""; @apply pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-[24px];
  background: radial-gradient(120px 120px at 100% 0%, rgba(0,0,0,0.04), transparent 60%); }
.stat-card:hover { @apply shadow-md; }
.stat-icon { @apply mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1; }
.stat-label { @apply text-sm font-medium text-gray-600; }
.stat-number { @apply mt-1 text-3xl font-extrabold tracking-tight text-gray-900; }
.stat-sub { @apply mt-1 text-xs text-gray-500; }
</style>
