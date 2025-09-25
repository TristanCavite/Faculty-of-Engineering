<template>
  <div class="mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl">
    <div class="from-maroon bg-gradient-to-r to-red-700 p-6 text-center">
      <h1 class="text-3xl font-extrabold text-white">Faculty Profile</h1>
    </div>

    <div class="p-8">
      <!-- Profile Picture -->
      <div class="mb-10 text-center">
        <div class="relative inline-block">
          <img
            :src="profilePhoto || 'https://via.placeholder.com/150'"
            alt="Profile"
            class="mx-auto h-32 w-32 rounded-full border-4 border-white object-cover shadow-md"
          />
          <label
            v-if="isEditing"
            for="file-upload"
            class="bg-maroon absolute bottom-0 right-0 cursor-pointer rounded-full p-1 text-white"
            title="Upload new photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 11l6-6" />
            </svg>
          </label>
          <input id="file-upload" type="file" class="hidden" accept="image/*" @change="onUpload" />
        </div>
        <h2 class="mt-4 text-2xl font-bold text-gray-800">{{ profile.fullName }}</h2>
      </div>

      <!-- Information Section -->
      <div class="mb-10 space-y-6">
        <h3 class="text-maroon text-lg font-bold">Information</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-semibold text-gray-600">Full Name</label>
            <input v-model="profile.fullName" :disabled="!isEditing" class="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Specialization</label>
            <input v-model="profile.specialization" :disabled="!isEditing" class="mt-1 w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label class="text-sm font-semibold text-gray-600">Contact Number</label>
            <input
              v-model="profile.contact"
              :disabled="!isEditing"
              type="text"
              placeholder="e.g. 09123456789"
              class="mt-1 w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label class="text-sm font-semibold text-gray-600">Personal Email</label>
            <input
              v-model="profile.personalEmail"
              :disabled="!isEditing"
              type="email"
              placeholder="e.g. me@example.com"
              class="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        </div>

        <!-- Highest Educational Attainment (UiTiptapEditor) -->
<!-- Highest Educational Attainment (UiTiptapEditor) -->
<div>
  <label class="text-sm font-semibold text-gray-600">Highest Educational Attainment</label>
  <client-only>
    <!-- EDIT MODE -->
    <UiTiptapEditor
      v-if="isEditing"
      :key="editorKey"
      class="mt-1 rounded border shadow-sm"
      v-model="educationDraft"        
      :editing="isEditing"       
      placeholder="About me"
    />
    <!-- VIEW MODE -->
    <div
      v-else
      class="prose prose-sm mt-1 max-w-none leading-tight"
      v-html="profile.educationHtml || 'N/A'"
    ></div>
  </client-only>
</div>


        <!-- Websites -->
        <div>
          <label class="text-sm font-semibold text-gray-600">Websites</label>
          <div v-if="isEditing" class="mt-1 space-y-2">
            <div v-for="(link, index) in profile.websites" :key="index" class="flex items-center gap-2">
              <input v-model="profile.websites[index]" type="url" class="w-full rounded border px-3 py-2" />
              <button @click="removeWebsite(index)" class="text-red-500" title="Remove">&times;</button>
            </div>
            <button @click="addWebsite" class="text-sm text-blue-600">+ Add website</button>
          </div>
          <div v-else>
            <a
              v-for="(link, index) in profile.websites"
              :key="index"
              :href="link"
              class="block text-blue-500 underline break-words"
              target="_blank"
              >{{ link }}</a
            >
            <p v-if="!profile.websites.length">N/A</p>
          </div>
        </div>
      </div>

      <!-- Account Details -->
      <div class="space-y-6">
        <h3 class="text-maroon text-lg font-bold">Account Details</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-semibold text-gray-600">Email</label>
            <input v-model="profile.email" disabled class="mt-1 w-full rounded border bg-gray-100 px-3 py-2" />
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">
              {{ isEditing ? 'New Password' : 'Password' }}
            </label>
            <input
              :type="'password'"
              :value="isEditing ? newPassword : '••••••••'"
              @input="(e) => isEditing && (newPassword = e.target.value)"
              :disabled="!isEditing"
              class="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div v-if="isEditing && newPassword" class="md:col-span-2">
            <label class="text-sm font-semibold text-gray-600">Current Password</label>
            <input v-model="currentPassword" type="password" class="mt-1 w-full rounded border px-3 py-2" />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-8 flex justify-end gap-4">
        <button @click="toggleEdit" class="rounded bg-gray-400 px-5 py-2 text-white hover:bg-gray-600">
          {{ isEditing ? 'Cancel' : 'Edit' }}
        </button>
        <button
          v-if="isEditing"
          @click="handleSave"
          class="bg-maroon rounded px-5 py-2 text-white hover:bg-red-700"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import UiTiptapEditor from '@/components/UiTiptapEditor.vue'

const props = defineProps({
  initialProfile: { type: Object, required: true },
  profilePhoto: String,
  isFaculty: Boolean,
})
const emit = defineEmits(['update-profile', 'upload-photo', 'change-password'])

const isEditing = ref(false)
const newPassword = ref('')
const currentPassword = ref('')

/** Local reactive profile */
const profile = ref({
  ...props.initialProfile,
  websites: Array.isArray(props.initialProfile?.websites) ? [...props.initialProfile.websites] : [],
  contact: props.initialProfile.contact || '',
  personalEmail: props.initialProfile.personalEmail || '',
  specialization: props.initialProfile.specialization || '',
  educationHtml: props.initialProfile.educationHtml || props.initialProfile.education || '',
})

/** Tiptap content draft + key to force re-mount on cancel */
const educationDraft = ref('')
const editorKey = ref(0)

/** Sync when parent updates initialProfile */
watch(
  () => props.initialProfile,
  (val) => {
    profile.value = {
      ...val,
      websites: Array.isArray(val?.websites) ? [...val.websites] : [],
      contact: val?.contact || '',
      personalEmail: val?.personalEmail || '',
      specialization: val?.specialization || '',
      educationHtml: val?.educationHtml || val?.education || '',
    }
    if (!isEditing.value) {
      educationDraft.value = profile.value.educationHtml || ''
    }
  },
  { immediate: true, deep: true }
)

const toggleEdit = () => {
  if (!isEditing.value) {
    // entering edit mode: seed editor with saved HTML
    educationDraft.value = profile.value.educationHtml || ''
  } else {
    // leaving edit mode without save: reset the editor by bumping key
    editorKey.value++
    newPassword.value = ''
    currentPassword.value = ''
  }
  isEditing.value = !isEditing.value
}

const handleSave = () => {
  // Trim trivial empty markup often produced by editors
  const cleaned = (educationDraft.value || '')
    .replace(/^(<p><br><\/p>\s*)+/, '')
    .replace(/(\s*<p><br><\/p>)+$/, '')
    .trim()

  if (!cleaned) {
    alert('Education field cannot be empty!')
    return
  }

  emit('update-profile', {
    ...profile.value,
    education: cleaned,
    educationHtml: cleaned,
    contact: profile.value.contact,
    personalEmail: profile.value.personalEmail,
    specialization: profile.value.specialization,
    websites: profile.value.websites,
  })

  if (newPassword.value && currentPassword.value) {
    emit('change-password', {
      newPassword: newPassword.value,
      currentPassword: currentPassword.value,
    })
  }

  // reset edit state
  isEditing.value = false
  newPassword.value = ''
  currentPassword.value = ''
}

const addWebsite = () => profile.value.websites.push('')
const removeWebsite = (index) => profile.value.websites.splice(index, 1)

const onUpload = (e) => {
  const file = e.target.files?.[0]
  if (file) emit('upload-photo', file)
}
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}

/* ✅ Keep text tidy in viewer */
.prose p {
  margin-top: 0 !important;
  margin-bottom: 0.25rem !important;
  line-height: 1.5 !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}
.prose ul,
.prose ol {
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
  padding-left: 1.25rem !important;
}
.prose {
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}
.prose p:empty {
  display: none;
}
</style>
