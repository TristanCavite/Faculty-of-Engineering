<template>
  <div class="space-y-3">
    <!-- Dropzone -->
    <div
      class="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition hover:border-maroon hover:bg-white"
      :class="{
        'border-maroon bg-white shadow-sm': isDragOver,
      }"
      @click="openFileDialog"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :multiple="multiple"
        accept="image/*"
        @change="onFileChange"
      />

      <div
        class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-maroon/10 text-maroon"
      >
        <ImageIcon class="h-6 w-6" />
      </div>

      <p class="text-sm font-medium text-gray-800">
        Drag &amp; drop images here
      </p>
      <p class="text-xs text-gray-500">
        or
        <button
          type="button"
          class="cursor-pointer font-semibold text-maroon underline hover:opacity-80"
          @click.stop="openFileDialog"
        >
          browse
        </button>
        from your device
      </p>

      <p v-if="hint" class="mt-1 text-xs text-gray-400">
        {{ hint }}
      </p>
    </div>

    <!-- Previews -->
    <div v-if="allPreviews.length" class="mt-2 flex gap-4 overflow-x-auto">
      <div
        v-for="(item, idx) in allPreviews"
        :key="item.key"
        class="relative"
      >
        <img
          :src="item.url"
          class="h-40 w-40 rounded border object-cover"
        />
        <button
          type="button"
          class="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-red-600 shadow hover:bg-white"
          aria-label="Remove image"
          @click.stop="removeAt(idx)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { Image as ImageIcon } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  /** Already uploaded image URLs (from Firestore) */
  existing: string[]
  /** Newly selected files (not yet uploaded) */
  newFiles: File[]
  /** Optional helper text under the dropzone */
  hint?: string
  /** Allow multiple selection (default true) */
  multiple?: boolean
}>(), {
  multiple: true,
})

const emit = defineEmits<{
  (e: 'update:existing', value: string[]): void
  (e: 'update:newFiles', value: File[]): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

/** Local previews for newFiles (object URLs) */
const newFilePreviews = ref<string[]>([])

/* keep previews in sync with props.newFiles */
watch(
  () => props.newFiles,
  (files) => {
    // cleanup old blob URLs
    newFilePreviews.value.forEach((url) => URL.revokeObjectURL(url))
    newFilePreviews.value = (files || []).map((f) => URL.createObjectURL(f))
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => {
  newFilePreviews.value.forEach((url) => URL.revokeObjectURL(url))
})

/** Combined view for existing URLs + new file previews */
const allPreviews = computed(() => {
  const existing = (props.existing || []).map((url, i) => ({
    url,
    key: `existing-${i}`,
    type: 'existing' as const,
  }))

  const files = newFilePreviews.value.map((url, i) => ({
    url,
    key: `new-${i}`,
    type: 'file' as const,
  }))

  return [...existing, ...files]
})

function openFileDialog() {
  fileInput.value?.click()
}

function handleFiles(files: FileList | File[]) {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
  if (!list.length) return
  const updated = [...(props.newFiles || []), ...list]
  emit('update:newFiles', updated)
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    handleFiles(target.files)
    target.value = '' // allow choosing same file again (including ctrl/shift multi-select)
  }
}

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  if (e.dataTransfer?.files?.length) {
    handleFiles(e.dataTransfer.files)
  }
}

/** Remove either an existing URL or a new file, by global index */
function removeAt(globalIndex: number) {
  const existingCount = props.existing.length

  if (globalIndex < existingCount) {
    const copy = [...props.existing]
    copy.splice(globalIndex, 1)
    emit('update:existing', copy)
  } else {
    const localIndex = globalIndex - existingCount
    const copy = [...props.newFiles]
    if (localIndex >= 0 && localIndex < copy.length) {
      copy.splice(localIndex, 1)
      emit('update:newFiles', copy)
    }
  }
}
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
.border-maroon {
  border-color: #740505;
}
</style>
