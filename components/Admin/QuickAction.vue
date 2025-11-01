<template>
  <NuxtLink :to="to" class="qa-card">
    <div class="qa-icon" :class="ring">
      <component :is="icon" class="h-5 w-5" :class="color" />
    </div>
    <span class="text-sm font-medium text-gray-800">{{ label }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  to: string
  label: string
  icon: any
  color?: string
  ring?: string
}>()
</script>

<style scoped lang="postcss">
.qa-card { @apply flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md; }
.qa-icon { @apply inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1; }
</style>

