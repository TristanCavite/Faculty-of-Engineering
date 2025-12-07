<template>
  <div class="space-y-4">
    <div v-for="i in 4" :key="i" class="rounded border bg-white p-4 shadow">
      <div class="animate-pulse space-y-3">
        <div class="h-3 w-24 rounded bg-gray-200"></div>
        <div class="h-5 w-3/4 rounded bg-gray-200"></div>
        <div class="h-4 w-full rounded bg-gray-200"></div>
        <div class="h-4 w-5/6 rounded bg-gray-200"></div>
      </div>
    </div>
  </div>
</template>
