<template>
  <div
    class="inline-flex rounded-full bg-neutral-100 p-1 shadow-inner"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opt in resolvedOptions"
      :key="opt.value"
      role="tab"
      type="button"
      :aria-selected="modelValue === opt.value"
      :class="btnClass(opt.value)"
      @click="$emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" class="mr-2 h-4 w-4" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LayoutGrid, List } from 'lucide-vue-next'

type Option = { value: string; label: string; icon: any }

const props = withDefaults(defineProps<{
  modelValue?: string
  options?: Option[]
  ariaLabel?: string
}>(), {
  modelValue: 'grid',
  ariaLabel: 'View mode',
})

defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const defaults: Option[] = [
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
]

const resolvedOptions = computed(() => props.options?.length ? props.options : defaults)

const btnClass = (value: string) => [
  'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1 ring-offset-neutral-100',
  props.modelValue === value
    ? 'bg-white text-maroon shadow ring-1 ring-black/80'
    : 'text-gray-600 hover:text-gray-900'
].join(' ')
</script>
