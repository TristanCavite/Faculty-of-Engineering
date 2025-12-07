<template>
  <div class="flex h-screen">
    <aside class="h-full w-64 bg-red-900 text-white">
      <HeaderAdmin class="pt-2" />

      <div class="p-4 text-base font-semibold">
        <nav>
          <ul class="space-y-2">
            <!-- Profile -->
            <li>
              <NuxtLink
                to="/admin/faculty/"
                class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
              >
                Profile
              </NuxtLink>
            </li>

            <!-- Manage dropdown (only shown if user has any manage access) -->
            <li v-if="hasAnyManageAccess">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded px-3 py-2 text-left transition duration-300 hover:scale-105 hover:bg-red-800"
                @click="manageOpen = !manageOpen"
              >
                <span>Manage</span>
               <ChevronRight
                  class="w-4 h-4 text-white transform transition-transform duration-200"
                  :class="{ 'rotate-90': manageOpen }"
                />
              </button>

              <transition name="fade">
                <ul
                  v-if="manageOpen"
                  class="mt-1 space-y-1 pl-4 text-sm font-normal"
                >
                  <!-- Alphabetical: About, Admission, Downloads, Events, Gallery, News, OBE, Research, Socials -->

                  <li v-if="hasManageAbout">
                    <NuxtLink
                      to="/admin/faculty/manage_about"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage About
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageAdmission">
                    <NuxtLink
                      to="/admin/faculty/admission"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Admission
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageDownloads">
                    <NuxtLink
                      to="/admin/faculty/downloads"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Downloads
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageEvents">
                    <NuxtLink
                      to="/admin/faculty/events"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Events
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageGallery">
                    <NuxtLink
                      to="/admin/faculty/manage_gallery"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Gallery
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageNews">
                    <NuxtLink
                      to="/admin/faculty/news"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage News
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageObe">
                    <NuxtLink
                      to="/admin/faculty/manage_obe"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage OBE
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageResearch">
                    <NuxtLink
                      to="/admin/faculty/research"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Research
                    </NuxtLink>
                  </li>

                  <li v-if="hasManageSocials">
                    <NuxtLink
                      to="/admin/faculty/socials"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Socials
                    </NuxtLink>
                  </li>
                </ul>
              </transition>
            </li>

            <!-- Logout -->
            <li>
              <button
                @click="logout"
                class="block w-full rounded px-3 py-2 text-left transition duration-300 hover:scale-105 hover:bg-yellow-400"
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import {
  useFirebaseAuth,
  useCurrentUser,
  useFirestore,
  useDocument,
} from "vuefire";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useRouter } from "vue-router";
import { ChevronRight } from "lucide-vue-next";
const auth = useFirebaseAuth();
const router = useRouter();

const currentUser = useCurrentUser();
const db = useFirestore();

const manageOpen = ref(true);

const userDocRef = computed(() => {
  if (!currentUser.value) return null;
  return doc(db, "users", currentUser.value.uid);
});

const { data: userDoc } = useDocument(userDocRef);

const moduleAccess = computed(() => userDoc.value?.moduleAccess || {});

const hasManageObe = computed(() => !!moduleAccess.value.manageObe);
const hasManageAbout = computed(() => !!moduleAccess.value.manageAbout);
const hasManageAdmission = computed(() => !!moduleAccess.value.manageAdmission);
const hasManageDownloads = computed(() => !!moduleAccess.value.manageDownloads);
const hasManageEvents = computed(() => !!moduleAccess.value.manageEvents);
const hasManageGallery = computed(() => !!moduleAccess.value.manageGallery);
const hasManageNews = computed(() => !!moduleAccess.value.manageNews);
const hasManageResearch = computed(() => !!moduleAccess.value.manageResearch);
const hasManageSocials = computed(() => !!moduleAccess.value.manageSocials);

const hasAnyManageAccess = computed(
  () =>
    hasManageObe.value ||
    hasManageAbout.value ||
    hasManageAdmission.value ||
    hasManageDownloads.value ||
    hasManageEvents.value ||
    hasManageGallery.value ||
    hasManageNews.value ||
    hasManageResearch.value ||
    hasManageSocials.value
);

const logout = async () => {
  if (auth) {
    await signOut(auth);
    router.push("/login");
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
