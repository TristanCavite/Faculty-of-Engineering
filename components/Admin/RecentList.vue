<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-800">{{ title }}</h2>
      <slot name="action"></slot>
    </div>

    <ul class="divide-y divide-gray-100">
      <li v-for="it in items" :key="it.key" class="py-3 flex items-start gap-3">
        <div class="rounded-lg p-2 ring-1" :class="it.bgRing">
          <component :is="it.icon" class="h-5 w-5" :class="it.iconColor" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900">
            {{ it.title || 'Untitled' }}
            <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{{ it.type }}</span>
          </p>
          <p v-if="it.preview" class="mt-0.5 line-clamp-1 text-xs text-gray-500" v-html="it.preview"></p>
          <p class="mt-0.5 text-xs text-gray-400">{{ formatTime(it.when) }}</p>
        </div>
        <NuxtLink :to="it.manageTo" class="text-xs font-medium text-maroon hover:underline">Open</NuxtLink>
      </li>

      <li v-if="!items.length && !loading" class="py-6 text-center text-sm text-gray-500">
        No recent items yet.
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  items: Array<{
    key: string
    type: string
    title?: string
    preview?: string
    when?: Date | string | number
    manageTo: string
    icon: any
    iconColor: string
    bgRing: string
  }>
  loading?: boolean
}>()

function formatTime(v: any) {
  const d = v instanceof Date ? v : new Date(v || Date.now())
  return d.toLocaleString()
}
</script>

<style scoped>
.text-maroon { color: #7b1d20; }
</style>
