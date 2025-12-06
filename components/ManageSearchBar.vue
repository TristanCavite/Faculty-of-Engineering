<template>
  <div class="relative">
    <UiInput
      ref="inputEl"
      v-model="local"
      type="search"
      :placeholder="placeholder"
      aria-label="Search"
      class="peer h-9 w-64 pl-9 pr-12 md:w-80
             rounded-lg border border-slate-300
             focus-visible:ring-1 focus-visible:ring-maroon/60"
    />

    <!-- Left search icon -->
    <Search
      class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
    />

    <!-- Clear button -->
    <button
      v-if="local"
      type="button"
      @click="clear"
      class="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1.5
             text-slate-400 hover:text-slate-600"
      aria-label="Clear search"
      title="Clear"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Search, X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  query: string
  placeholder?: string
  debounce?: number
}>(), {
  placeholder: 'Search…',
  debounce: 250,
})

const emit = defineEmits<{ (e: 'update:query', v: string): void }>()
const local = ref(props.query)
let t: ReturnType<typeof setTimeout> | null = null

watch(() => props.query, v => { if (v !== local.value) local.value = v })
watch(local, (v) => {
  if (t) clearTimeout(t)
  t = setTimeout(() => emit('update:query', v), props.debounce)
})

function clear() { local.value = '' }

/* Optional: Ctrl/⌘+K focus */
const inputEl = ref<HTMLInputElement | null>(null)
function onKeydown(e: KeyboardEvent) {
  if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    inputEl.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  if (t) clearTimeout(t)
  window.removeEventListener('keydown', onKeydown)
})
</script>
