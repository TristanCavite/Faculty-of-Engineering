<template>
  <transition name="slide-in-right">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <div
        class="flex-1 bg-black/40"
        @click="handleClose"
      />

      <!-- Panel -->
      <div class="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <!-- Header -->
        <div class="border-b px-6 py-4 space-y-3">
          <!-- Title + close -->
          <div class="flex items-start justify-between">
            <h2 class="text-lg font-semibold text-slate-900">
              Manage Access
            </h2>

            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              @click="handleClose"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <!-- Profile row -->
          <div class="flex items-center gap-3">
            <img
              :src="userPhoto || '/placeholder.png'"
              alt="Profile"
              class="h-10 w-10 rounded-full object-cover"
            />
            <div class="flex flex-col">
              <span class="text-sm font-semibold text-slate-900">
                {{ userName }}
              </span>
              <span class="text-xs text-slate-500">
                <span v-if="userRoleLabel">
                  {{ userRoleLabel }} ·
                </span>
                {{ userEmail }}
              </span>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <p class="text-xs text-slate-500">
            Toggle which sections this account is allowed to manage. These
            will appear in the user's sidebar.
          </p>

          <div class="space-y-4">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Content Sections
            </h3>

            <!-- Grid of toggles -->
            <div class="grid grid-cols-1 gap-3">
              <!-- Manage Downloads -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage Downloads
                  </p>
                  <p class="text-xs text-slate-500">
                    Upload and organize downloadable files.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageDownloads"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage Admission -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage Admission
                  </p>
                  <p class="text-xs text-slate-500">
                    Edit admission page content and sections.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageAdmission"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage OBE -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage OBE
                  </p>
                  <p class="text-xs text-slate-500">
                    Outcomes-Based Education content and documents.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageObe"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage Events -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage Events
                  </p>
                  <p class="text-xs text-slate-500">
                    Create and update college events.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageEvents"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage News -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage News
                  </p>
                  <p class="text-xs text-slate-500">
                    Post and edit news articles.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageNews"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage Research -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage Research
                  </p>
                  <p class="text-xs text-slate-500">
                    Maintain research listings and details.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageResearch"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage Socials -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage Socials
                  </p>
                  <p class="text-xs text-slate-500">
                    Update social media embeds and links.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageSocials"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage Gallery -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage Gallery
                  </p>
                  <p class="text-xs text-slate-500">
                    Upload and organize gallery photos.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageGallery"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>

              <!-- Manage About -->
              <label
                class="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p class="text-sm font-medium text-slate-800">
                    Manage About
                  </p>
                  <p class="text-xs text-slate-500">
                    Edit about page sections and overview.
                  </p>
                </div>
                <input
                  v-model="localAccess.manageAbout"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-maroon focus:ring-maroon"
                />
              </label>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 border-t px-6 py-3">
          <UiButton
            variant="ghost"
            class="text-slate-700"
            @click="handleClose"
          >
            Cancel
          </UiButton>
          <UiButton
            class="bg-maroon text-white hover:opacity-90"
            @click="handleSave"
          >
            Save changes
          </UiButton>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";

type ModuleAccess = {
  manageDownloads: boolean;
  manageAdmission: boolean;
  manageObe: boolean;
  manageEvents: boolean;
  manageNews: boolean;
  manageResearch: boolean;
  manageSocials: boolean;
  manageGallery: boolean;
  manageAbout: boolean;
};

const props = defineProps<{
  open: boolean;
  userName: string;
  userEmail: string;
  userRoleLabel?: string;
  userPhoto?: string | null;
  initialAccess?: Partial<ModuleAccess>;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "save", value: ModuleAccess): void;
}>();

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

// local copy so we can edit freely
const localAccess = reactive<ModuleAccess>({
  manageDownloads: props.initialAccess?.manageDownloads ?? false,
  manageAdmission: props.initialAccess?.manageAdmission ?? false,
  manageObe: props.initialAccess?.manageObe ?? false,
  manageEvents: props.initialAccess?.manageEvents ?? false,
  manageNews: props.initialAccess?.manageNews ?? false,
  manageResearch: props.initialAccess?.manageResearch ?? false,
  manageSocials: props.initialAccess?.manageSocials ?? false,
  manageGallery: props.initialAccess?.manageGallery ?? false,
  manageAbout: props.initialAccess?.manageAbout ?? false,
});

// if a different user gets passed in with different access
watch(
  () => props.initialAccess,
  (value) => {
    localAccess.manageDownloads = value?.manageDownloads ?? false;
    localAccess.manageAdmission = value?.manageAdmission ?? false;
    localAccess.manageObe = value?.manageObe ?? false;
    localAccess.manageEvents = value?.manageEvents ?? false;
    localAccess.manageNews = value?.manageNews ?? false;
    localAccess.manageResearch = value?.manageResearch ?? false;
    localAccess.manageSocials = value?.manageSocials ?? false;
    localAccess.manageGallery = value?.manageGallery ?? false;
    localAccess.manageAbout = value?.manageAbout ?? false;
  },
  { deep: true }
);

function handleClose() {
  open.value = false;
}

function handleSave() {
  emit("save", { ...localAccess });
  open.value = false;
}
</script>

<style scoped>
.slide-in-right-enter-active,
.slide-in-right-leave-active {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}
.slide-in-right-enter-from,
.slide-in-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
