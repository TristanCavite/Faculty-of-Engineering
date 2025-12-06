<template>
  <div class="relative w-full max-w-sm">
    <!-- Search icon -->
    <span
      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"
    >
      <Search class="w-4 h-4" />
    </span>

    <!-- Input -->
    <input
      :value="modelValue"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      :placeholder="placeholder"
      type="text"
      class="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm
             placeholder:text-gray-400 focus:border-red-900 focus:outline-none
             focus:ring-1 focus:ring-red-900"
    />
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
  }>(),
  {
    placeholder: 'Search users by name or email...',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const onInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const onFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const onBlur = (event: FocusEvent) => {
  emit('blur', event)
}
</script>
