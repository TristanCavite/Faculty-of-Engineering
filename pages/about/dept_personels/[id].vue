<template>
  <div class="min-h-screen bg-neutral-100">
    <!-- 🔒 Left-Aligned Title Cover Image Block -->
    <div class="relative flex items-center w-full font-playfair">
      <img src="/CET Faculty.jpg" alt="Department Cover" class="object-cover w-full h-44 md:h-128" />
      <div class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 bg-gray-700/90 px-2 py-2">
        <span class="text-xl text-white md:text-6xl">
          {{ dept?.name || "Department" }}
        </span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl px-4 py-12 mx-auto">
      <!-- Head Admin -->
      <div v-if="dept?.headAdmin" class="flex flex-col mb-12 text-center">
        <span class="mb-6 text-2xl font-bold text-green-950 md:text-5xl font-playfair">Department Head</span>
        <div
          @click="openProfile(dept.headAdmin, 'Head Admin')"
          class="flex flex-col items-center justify-start w-full p-2 mx-auto transition bg-white rounded-lg shadow cursor-pointer md:p-6 hover:shadow-lg sm:w-96"
        >
          <img
            :src="dept.headAdmin.photo || '/placeholder.png'"
            alt="Head Admin"
            class="object-cover mx-auto mb-4 border-2 rounded-full size-24 border-maroon"
          />
          <h3 class="text-lg font-semibold text-center text-maroon">
            {{ dept.headAdmin.fullName || dept.headAdmin.name }}
          </h3>
          <p class="text-sm text-center text-gray-600">
            Department Head – {{ dept.name }}
          </p>
          <p class="text-sm text-center text-gray-500">
            {{ dept.headAdmin.designation || 'No designation' }}
          </p>
        </div>
      </div>

        <!-- Staff -->
      <div v-if="dept?.staff?.length" class="max-w-6xl text-center">
        <span class="mb-6 text-2xl font-bold text-center text-green-950 md:text-5xl font-playfair">Faculty and Staff</span>
        <div class="grid grid-cols-2 gap-6 mt-6 md:grid-cols-3">
          <template v-for="(staff, index) in dept.staff" :key="index">
            <div
              v-if="staff.status === 'active'"
              class="flex flex-col items-center justify-start p-2 transition bg-white rounded-lg shadow cursor-pointer md:p-6 hover:shadow-lg"
              @click="openProfile(staff, 'Staff')"
            >
              <img
                :src="staff.photo || '/placeholder.png'"
                alt="Staff"
                class="object-cover mx-auto mb-4 border-2 rounded-full size-24 border-maroon"
              />
              <h3 class="text-lg font-semibold text-center text-maroon">
                {{ staff.fullName || staff.name }}
              </h3>
              <p class="text-sm text-center text-gray-600">
                {{ staff.designation || "No designation" }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Profile Modal -->
    <ProfilePreviewModal v-if="showModal" :profile="selectedProfile" @close="showModal = false" />
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
      layout: "custom",
  });
  import ProfilePreviewModal from "@/components/ProfilePreviewModal.vue";
  import { doc } from "firebase/firestore";
  import { useRoute } from "vue-router";
  import { useDocument, useFirestore } from "vuefire";

  const route = useRoute();
  const deptId = route.params.id as string;
  const db = useFirestore();

  const { data: dept } = useDocument(doc(db, "departments", deptId));

  const showModal = ref(false);
  const selectedProfile = ref<any>(null);

  function openProfile(profile: any, role: string) {
    selectedProfile.value = {
      ...profile,
      role,
      departmentName: dept.value?.name || "",
    };
    showModal.value = true;
  }
</script>

<style scoped>
  .text-maroon {
    color: #740505;
  }
  .border-maroon {
    border-color: #740505;
  }
</style>
