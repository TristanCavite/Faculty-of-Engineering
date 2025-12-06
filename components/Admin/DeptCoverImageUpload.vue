<template>
  <section class="mx-auto mt-6 mb-10 max-w-5xl">
    <!-- Top row: label + button -->
    <div class="flex items-center justify-between gap-4">
    

      <UiButton
        type="button"
        class="bg-red-900 text-white hover:bg-red-800 hover:scale-105"
        :disabled="uploading"
        @click="openFilePicker"
      >
        {{ uploading ? "Uploading…" : "Upload Cover Image" }}
      </UiButton>

      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileChange"
      />
    </div>

    <!-- Preview, same feel as public page -->
    <div class="mt-4">
      <div
        v-if="modelValue"
        class="overflow-hidden rounded-lg border border-neutral-200 bg-black/5"
      >
        <img
          :src="modelValue"
          alt="Department Faculty & Staff cover"
          class="h-64 w-full object-cover md:h-80"
        />
      </div>

      <div
        v-else
        class="flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500"
      >
        No cover image uploaded yet.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue"
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage"

const props = defineProps<{
  modelValue: string | null
  storagePath: string
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const storage = getStorage()
    // fixed filename so re-upload replaces the old one
    const path = `${props.storagePath}/cover.jpg`
    const fileRef = storageRef(storage, path)

    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)

    emit("update:modelValue", url)
  } catch (err) {
    console.error("Error uploading cover image", err)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ""
  }
}
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
</style>
