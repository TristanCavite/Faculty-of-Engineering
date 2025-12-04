<template>
  <!-- EXACT same shell as your old add_download root -->
  <div class="mx-auto max-w-6xl px-4 py-8 md:pt-10 space-y-6">
    <!-- Top bar -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-maroon">
        {{ isEditMode ? editTitle : createTitle }}
      </h1>

      <div class="flex items-center gap-2">
        <!-- Close -->
        <UiButton
          type="button"
          class="btn-outline-maroon"
          @click="$emit('close')"
        >
          Close
        </UiButton>

        <!-- Save -->
        <UiButton
          type="button"
          class="btn-outline-maroon"
          :disabled="saving || !isValid"
          @click="$emit('save')"
        >
          {{ saving && lastAction === 'save' ? 'Saving…' : 'Save' }}
        </UiButton>

        <!-- Publish -->
        <UiButton
          type="button"
          class="bg-maroon text-white hover:opacity-90"
          :disabled="saving || !isValid"
          @click="$emit('publish')"
        >
          {{ saving && lastAction === 'publish' ? 'Publishing…' : 'Publish' }}
        </UiButton>
      </div>
    </div>

    <!-- Notice (same look as before, spacing handled by space-y-6) -->
    <transition name="fade">
      <div
        v-if="notice"
        class="flex items-start gap-3 rounded border p-3"
        :class="notice.type === 'success'
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-red-200 bg-red-50 text-red-800'"
        role="status"
      >
        <span class="font-medium">{{ notice.title }}</span>
        <button
          type="button"
          class="ml-auto opacity-70 hover:opacity-100"
          @click="$emit('clear-notice')"
        >
          ✕
        </button>
      </div>
    </transition>

    <!-- Optional validation error -->
    <p
      v-if="validationError"
      class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ validationError }}
    </p>

    <!-- Page-specific form -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

type NoticeType = 'success' | 'error'
interface Notice {
  type: NoticeType
  title: string
}

interface Props {
  createTitle: string
  editTitle: string
  isEditMode: boolean
  saving: boolean
  lastAction: 'save' | 'publish' | null
  notice: Notice | null
  validationError?: string | null
  isValid?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isValid: true,
  validationError: null,
})

const {
  createTitle,
  editTitle,
  isEditMode,
  saving,
  lastAction,
  notice,
  validationError,
  isValid,
} = toRefs(props)

defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'publish'): void
  (e: 'clear-notice'): void
}>()
</script>

<style scoped>
.text-maroon { color:#740505; }
.bg-maroon { background-color:#740505; }

.btn-outline-maroon {
  background-color: #ffffff;
  border: 1px solid #740505;
  color: #740505;
  transition: background-color .15s, color .15s, border-color .15s;
}
.btn-outline-maroon:hover {
  background-color: #740505;
  color: #ffffff !important;
}

/* same fade used before */
.fade-enter-active,
.fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
