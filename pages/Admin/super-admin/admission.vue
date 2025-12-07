<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
   <div class="flex flex-col">
      <span class="text-4xl font-bold text-red-900 font-montserrat">
        Manage Admission Sections
      </span>
      <span class="text-xs font-montserrat">
        Manage the content displayed on the Admission page
      </span>
    </div>

    <!-- Section Selector -->
    <div>
      <label class="mb-1 block font-semibold">Select Section</label>
      <select v-model="selectedSection" class="select select-bordered w-full">
        <option disabled value="">-- Choose section --</option>
        <option value="why_choose_vsu">Why Choose VSU?</option>
        <option value="undergraduate">Undergraduate</option>
        <option value="graduate">Graduate</option>

        <!-- extras appended from Firestore collection -->
        <option
          v-for="s in extraSections"
          :key="s.id"
          :value="s.id"
        >
          {{ (s.title && s.title.trim()) ? s.title : 'Extra Section' }}
        </option>
      </select>
    </div>

    <!-- Visibility toggle: for undergraduate and extras -->
    <div
      v-if="isUndergrad || isExtraSection"
      class="rounded-lg border bg-white p-4 shadow"
    >
      <div class="flex items-start justify-between gap-6">
        <div>
          <h3 class="font-semibold">
            {{ isUndergrad ? 'Show Undergraduate on public' : 'Show on public' }}
          </h3>
          <p class="text-sm text-gray-600">
            When unchecked, this page is hidden from the public navbar and direct
            links will return 404 / not be displayed.
          </p>
        </div>

        <label class="flex select-none items-center gap-3">
          <input
            type="checkbox"
            v-model="showSectionPublic"
            class="h-5 w-5 cursor-pointer accent-green-600"
            @change="saveVisibility"
          />
          <span class="text-sm font-medium">
            {{ showSectionPublic ? 'Visible' : 'Hidden' }}
          </span>
        </label>
      </div>

      <p v-if="visSavedAt" class="mt-2 text-xs text-gray-500">
        Updated: {{ visSavedAt }}
      </p>
    </div>

    <!-- Form Section -->
    <div v-if="selectedSection" class="grid gap-6">
      <!-- Title / Name - only show for extras -->
      <div v-if="isExtraSection">
        <label class="mb-1 block font-semibold">Name / Title Section</label>
        <div class="flex gap-3">
          <input
            v-model="form.title"
            type="text"
            placeholder="Enter the section title (leave empty => 'Extra Section')"
            class="input input-bordered flex-1"
          />
          <UiButton
            class="bg-maroon text-white"
            :disabled="!selectedSection"
            @click="saveTitle"
          >
            Save Title
          </UiButton>
        </div>
      </div>

      <!-- Shared cover + video + content block -->
      <AdminSectionMediaContent
        :coverImageUrl="form.coverImageUrl"
        :pendingCoverPreview="pendingCoverPreview"
        v-model:content="form.content"
        v-model:videoUrl="form.videoUrl"
        :isEditing="isEditing"
        :isDirty="isDirty"
        :saving="saving"
        :showVideoField="true"
        :imageUploadHandler="handleEditorImageUpload"
        :notice="notice"
        @clear-notice="notice = null"
        @cover-change="handleImage"
        @toggle-edit="toggleEdit"
        @save="saveSection"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminSectionMediaContent from '@/components/Admin/AdminSectionMediaContent.vue'
import { useMultiSectionContent } from '@/composables/useMultiSectionContent'

definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

// Reuse the same composable, but in "admission" mode
const {
  isEditing,
  selectedSection,
  saving,
  form,
  pendingCoverPreview,
  extraSections,
  showSectionPublic,
  visSavedAt,
  notice,
  isExtraSection,
  isDirty,
  handleImage,
  handleEditorImageUpload,
  saveTitle,
  saveSection,
  toggleEdit,
  saveVisibility,
} = useMultiSectionContent('admission')

// Local helper for the special Undergraduate section
const isUndergrad = computed(() => selectedSection.value === 'undergraduate')
</script>

<style>
.bg-maroon {
  background-color: #740505;
}

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
