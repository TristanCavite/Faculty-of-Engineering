<!-- components/Admin/AdminSectionMediaContent.vue -->
<template>
  <div class="space-y-4">
    <!-- Notice banner (shared across all pages that use this component) -->
    <div v-if="notice" class="mb-2">
      <div
        class="flex items-center justify-between rounded-md border px-4 py-2 text-sm"
        :class="
          notice.type === 'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'border-red-300 bg-red-50 text-red-800'
        "
      >
        <span>{{ notice.title }}</span>
        <button
          type="button"
          class="ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold leading-none"
          @click="$emit('clear-notice')"
        >
          <span aria-hidden="true">×</span>
          <span class="sr-only">Close</span>
        </button>
      </div>
    </div>

    <!-- Main grid -->
    <div class="grid gap-6">
      <!-- Cover Image -->
      <div>
        <label class="mb-1 block font-semibold">Cover Image</label>

        <UiSingleImageUpload
          :imageUrl="coverPreviewUrl"
          @change="(e) => $emit('cover-change', e)"
        />

        <p v-if="pendingCoverPreview" class="mt-1 text-xs text-amber-600">
          This image is not saved yet — it will be uploaded when you click
          <b>Save Changes</b>.
        </p>
      </div>

      <!-- Promotional Video (optional) -->
      <div v-if="showVideoField">
        <label class="mb-1 block font-semibold">
          {{ videoLabel }}
          <span class="text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <input
          v-model="videoModel"
          type="url"
          class="input input-bordered w-full"
          :placeholder="videoPlaceholder"
        />
        <p class="mt-1 text-xs text-gray-500">
          {{ videoHint }}
        </p>

        <!-- Video preview (if we can build an embed URL) -->
        <div
          v-if="normalizedVideoEmbedUrl"
          class="mt-3 aspect-video w-full overflow-hidden rounded border bg-black"
        >
          <iframe
            :src="normalizedVideoEmbedUrl"
            class="h-full w-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          />
        </div>
      </div>

      <!-- Content -->
      <div>
        <label class="mb-2 block font-semibold">Content</label>

        <!-- Edit / Cancel toggle -->
        <UiButton
          class="bg-maroon text-white hover:opacity-90"
          type="button"
          @click="$emit('toggle-edit')"
        >
          {{ isEditing ? 'Cancel' : 'Edit Content' }}
        </UiButton>

        <!-- PREVIEW -->
        <div
          v-if="!isEditing"
          class="cet-content prose max-w-none rounded border bg-white p-4 shadow"
          v-html="contentModel"
        />

        <!-- EDITOR -->
        <div
          v-else
          class="cet-content prose max-w-none rounded border bg-white p-4 shadow"
        >
          <UiTiptapEditor
            v-model="contentModel"
            :editing="isEditing"
            @image-upload="imageUploadHandler"
          />
        </div>

        <!-- Save -->
        <div class="mt-4 flex items-center justify-end gap-3">
          <span v-if="!isDirty" class="text-sm text-gray-400">No changes</span>
          <UiButton
            class="bg-maroon text-white hover:opacity-90 disabled:opacity-50"
            type="button"
            :disabled="!isDirty || saving"
            @click="$emit('save')"
          >
            {{ saving ? 'Saving…' : 'Save Changes' }}
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiTiptapEditor from '@/components/UiTiptapEditor.vue'
import UiSingleImageUpload from '@/components/Admin/UiSingleImageUpload.vue'

type NoticeType = 'success' | 'error'
interface Notice {
  type: NoticeType
  title: string
}

const props = withDefaults(
  defineProps<{
    /** Saved cover image URL from Firestore */
    coverImageUrl?: string
    /** Unsaved local preview URL (from URL.createObjectURL) */
    pendingCoverPreview?: string
    /** Current HTML content */
    content: string
    /** Current video URL (optional) */
    videoUrl?: string
    /** Is the editor in editing mode? (parent controls) */
    isEditing: boolean
    /** Are there unsaved changes? (parent computed) */
    isDirty: boolean
    /** Optional saving flag for button label */
    saving?: boolean
    /** Show video field or not */
    showVideoField?: boolean
    /** Label + hint + placeholder for video input */
    videoLabel?: string
    videoHint?: string
    videoPlaceholder?: string
    /** Handler passed down to Tiptap for image uploads */
    imageUploadHandler?: (file: File) => Promise<string>
    /** Optional notice banner (success / error) */
    notice?: Notice | null
  }>(),
  {
    coverImageUrl: '',
    pendingCoverPreview: '',
    videoUrl: '',
    saving: false,
    showVideoField: true,
    videoLabel: 'Promotional Video (YouTube/Vimeo)',
    videoHint: 'Leave this blank if there is no video for this page.',
    videoPlaceholder: 'https://www.youtube.com/watch?v=...',
    imageUploadHandler: undefined,
    notice: null,
  },
)

const emit = defineEmits<{
  (e: 'update:content', value: string): void
  (e: 'update:videoUrl', value: string): void
  (e: 'cover-change', event: Event): void
  (e: 'toggle-edit'): void
  (e: 'save'): void
  (e: 'clear-notice'): void
}>()

/** What to show in the cover preview box */
const coverPreviewUrl = computed(
  () => props.pendingCoverPreview || props.coverImageUrl || '',
)

/** v-model bridge for content */
const contentModel = computed({
  get: () => props.content ?? '',
  set: (val: string) => emit('update:content', val),
})

/** v-model bridge for video URL */
const videoModel = computed({
  get: () => props.videoUrl ?? '',
  set: (val: string) => emit('update:videoUrl', val),
})

/** Normalized embed URL for previewing the video */
const normalizedVideoEmbedUrl = computed(() => {
  const raw = videoModel.value?.trim()
  if (!raw) return ''

  try {
    const u = new URL(raw)

    // YouTube handling
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = ''

      if (u.hostname.includes('youtu.be')) {
        // https://youtu.be/VIDEOID
        videoId = u.pathname.replace('/', '')
      } else {
        // https://www.youtube.com/watch?v=VIDEOID
        videoId = u.searchParams.get('v') || ''
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
      return raw
    }

    // For other providers (Vimeo, etc.), just return raw URL
    return raw
  } catch {
    return raw
  }
})
</script>

<style scoped>
.bg-maroon {
  background-color: #740505;
}

/* Keep editor look consistent with other admin pages */
.ProseMirror {
  outline: none !important;
}

.EditorContent {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  min-height: 300px;
  background-color: #ffffff;
}

.resizable-image {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.5rem 0;
}

.EditorContent span[style*='font-size'],
.EditorContent span[style*='color'] {
  display: inline-block;
}
</style>
