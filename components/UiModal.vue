<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4"
    @click.self="$emit('close')"
  >
    <!-- Modal Container -->
    <div class="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- Header -->
      <div class="flex justify-between items-center p-4 border-b">
        <h3 class="text-lg font-semibold text-maroon">
          <slot name="header">Modal</slot>
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-red-500">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 text-gray-700">
        <slot />
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-4 py-3 border-t">
        <slot name="footer">
          <UiButton @click="$emit('close')">Close</UiButton>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
</script>
