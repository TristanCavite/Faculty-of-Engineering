<!-- components/UiSingleImageUpload.vue -->
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
      <!-- Hidden native input -->
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="accept"
        @change="onFileChange"
      />

      <!-- Icon -->
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-maroon/10">
        <ImageIcon class="h-6 w-6 text-maroon" />
      </div>

      <!-- Text -->
      <p class="text-sm font-medium text-gray-800">
        Drag &amp; drop an image here
      </p>
      <p class="text-xs text-gray-500">
        or
        <button
          type="button"
          class="font-semibold text-maroon underline"
          @click.stop="openFileDialog"
        >
          browse
        </button>
        from your device
      </p>

      <p class="mt-1 text-xs text-gray-400">
        This image will be used as the cover.
      </p>
    </div>

    <!-- Preview -->
    <div
      v-if="displayUrl"
      class="mt-2 relative flex justify-center overflow-hidden rounded border bg-gray-100"
    >
      <img
        :src="displayUrl"
        class="max-h-96 w-auto object-contain p-2"
      />

      <!-- Inline loading overlay while upload in progress -->
      <UiLoadingOverlay
        :show="!!(localPreview && !imageUrl)"
        label="Uploading…"
        inline
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Image as ImageIcon } from 'lucide-vue-next'
import UiLoadingOverlay from '@/components/UiLoadingOverlay.vue'

const props = withDefaults(
  defineProps<{
    /** Current image URL (e.g. from Firestore / Storage) */
    imageUrl?: string | null
    /** Accept attribute (defaults to images only) */
    accept?: string
  }>(),
  {
    imageUrl: '',
    accept: 'image/*',
  },
)

const emit = defineEmits<{
  /** Forward the native change event so parent can handle upload */
  (e: 'change', event: Event): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

/** Local instant preview while upload is happening */
const localPreview = ref<string | null>(null)

/** URL we actually render */
const displayUrl = computed(() => localPreview.value || props.imageUrl || '')

function openFileDialog() {
  fileInput.value?.click()
}

function setLocalPreview(file: File) {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value)
  }
  localPreview.value = URL.createObjectURL(file)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    setLocalPreview(file)
  }
  emit('change', e)
}

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (!files?.length || !fileInput.value) return

  const file = files[0]
  setLocalPreview(file)

  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(file)
  fileInput.value.files = dataTransfer.files

  const changeEvent = new Event('change', { bubbles: true })
  fileInput.value.dispatchEvent(changeEvent)
}

/** When the real URL from parent arrives, drop the blob URL */
watch(
  () => props.imageUrl,
  (val) => {
    if (val && localPreview.value) {
      URL.revokeObjectURL(localPreview.value)
      localPreview.value = null
    }
  },
)

/** Cleanup on unmount */
onBeforeUnmount(() => {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value)
  }
})
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
</style>
