<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50"
    role="dialog"
    aria-modal="true"
    @mousedown="handleOutsideClick"
  >
    <!-- Modal shell (keeps the card centered) -->
    <div class="w-full max-w-xl">
      <!-- Card -->
      <div ref="modalRef" class="relative w-full bg-white rounded-2xl ">
        <!-- Avatar (perfectly centered) -->
        <div class="absolute z-10 -translate-x-1/2 -translate-y-1/2 left-1/2">
          <img
            :src="profile?.photo || '/placeholder.png'"
            alt="Profile Picture"
            class="object-cover rounded-full shadow-lg size-32 ring-4 ring-white"
          />
        </div>

        <!-- Close + optional delete -->
        <UiButton
          title="Close"
          class="absolute inline-flex items-center justify-center p-1 text-white transition bg-transparent rounded-full right-3 top-3 hover:bg-gray-200 hover:text-gray-700 hover:scale-105"
          @click="$emit('close')"
        >
          <X class="px-2 size-9" />
        </UiButton>

        <UiButton
          v-if="showDelete"
          title="Delete"
          class="absolute inline-flex items-center justify-center p-1 text-yellow-400 transition bg-transparent rounded-full left-3 top-3 hover:bg-gray-200 hover:scale-105"
          @click="() => { $emit('remove', profile); $emit('close') }"
        >
          <IconsTrash class="px-2 size-9" />
        </UiButton>

        <!-- Header -->
        <div class="flex flex-col w-full pt-16 pb-4 text-center bg-red-900 rounded-2xl">
          <span class="text-3xl font-bold text-white font-montserrat">
            {{ profile?.fullName || profile?.name || "No Name Provided" }}
          </span>
          <span class="mt-1 text-xs font-semibold text-yellow-400 font-roboto">
            {{
              profile?.role === "Head Admin" && profile?.departmentName
                ? `Department Head (${profile.departmentName})`
                : profile?.designation || "No Designation"
            }}
          </span>
        </div>
        <!-- Scrollable content area -->
        <div class="max-h-[82vh] overflow-y-auto px-6 pb-8 md:px-10">
          <!-- Info Section -->
          <div class="mt-6 space-y-6">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 text">
              <div class="flex flex-col">
                  <span class="text-sm font-bold text-red-900 font-montserrat text">Full Name:</span>
                  <span class="text-base font-semibold font-roboto">{{ profile?.fullName || profile?.name || "N/A" }}</span>
                </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-red-900 font-montserrat">Specialization:</span>
                <span class="text-base font-semibold font-roboto">{{ profile?.specialization || "N/A" }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-red-900 font-montserrat">Contact:</span>
                <span class="text-base font-semibold font-roboto">{{ profile?.contact || "N/A" }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-red-900 font-montserrat">Personal Email:</span>
                <span class="text-base font-semibold break-words font-roboto">{{ profile?.personalEmail || "N/A" }}</span>
              </div>
            </div>

            <!-- Faculty Type + Home Department (only if memberType exists) -->
            <div v-if="profile?.memberType" class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div class="flex flex-col">
                <span class="text-sm font-bold text-red-900 font-montserrat">Faculty Type:</span>
                <span class="text-base font-semibold font-roboto">{{ profile.memberType }}</span>
              </div>
              <div v-if="profile.memberType === 'Affiliate'" class="flex flex-col">
                <span class="text-sm font-bold text-red-900 font-montserrat">Home Department:</span>
                <span class="text-base font-semibold font-roboto">{{ profile.homeDepartment || "N/A" }}</span>
              </div>
            </div>

            <div>
              <span class="text-sm font-bold text-red-900 font-montserrat">Highest Educational Attainment:</span>
              <div
                class="text-sm prose text-black break-words whitespace-pre-wrap max-w-none font-roboto"
                v-html="profile?.educationHtml || profile?.education || 'N/A'"
              />
            </div>

            <div>
              <span class="text-sm font-bold text-red-900 font-montserrat">Websites:</span>
              <div class="text-base font-semibold font-roboto">
                <template v-if="profile?.websites?.length">
                  <ul class="ml-6 space-y-1 list-disc">
                    <li v-for="(website, index) in profile.websites" :key="index">
                      <a
                        :href="website"
                        target="_blank"
                        class="text-blue-600 underline break-words"
                      >
                        {{ website }}
                      </a>
                    </li>
                  </ul>
                </template>
                <p v-else>No websites provided</p>
              </div>
            </div>
          </div>
          <!-- /Info Section -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X } from "lucide-vue-next";
import { ref } from "vue";

  defineProps({
    profile: Object,
    showDelete: Boolean,
  });

  const emit = defineEmits(["close", "remove"]);
  const modalRef = ref(null);

  function handleOutsideClick(event) {
    if (modalRef.value && !modalRef.value.contains(event.target)) {
      emit("close");
    }
  }
</script>

<style scoped>
  /* Optional: smoothen native scrollbar on WebKit */
  ::-webkit-scrollbar {
    width: 10px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 9999px;
    border: 2px solid transparent;
    background-clip: content-box;
  }

  /* *{
    outline:1px solid red
  } */
</style>
