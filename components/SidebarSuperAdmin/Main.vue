<template>
  <div class="flex h-screen">
    <aside class="h-full w-64 bg-red-900 text-white">
      <HeaderAdmin class="pt-2" />

      <div class="p-4 text-base font-semibold">
        <nav>
          <ul class="space-y-2">
            <!-- Home -->
            <li>
              <NuxtLink
                to="/admin/super-admin/"
                class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                exact-active-class="text-black bg-yellow-400"
              >
                Home
              </NuxtLink>
            </li>

            <!-- Departments -->
            <li>
              <NuxtLink
                to="/admin/super-admin/manage_department"
                class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                exact-active-class="text-black bg-yellow-400"
              >
                Departments
              </NuxtLink>
            </li>

            <!-- Faculty & Staff -->
            <li>
              <NuxtLink
                to="/admin/super-admin/faculty_staff"
                class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                exact-active-class="text-black bg-yellow-400"
              >
                Faculty and Staff
              </NuxtLink>
            </li>

            <!-- Manage (always visible, compact submenu like faculty) -->
            <li>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded px-3 py-2 text-left transition duration-300 hover:scale-105 hover:bg-red-800"
                @click="manageOpen = !manageOpen"
              >
                <span>Manage</span>
                <!-- icon: right when closed, down when open -->
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
                  <!-- Alphabetical list (compact) -->
                  <li>
                    <NuxtLink
                      to="/admin/super-admin/manage_about"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage About
                    </NuxtLink>
                  </li>

                     <li>
                    <NuxtLink
                      to="/admin/super-admin/manage_accounts"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Accounts
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/admission"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Admission
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/downloads"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Downloads
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/events"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Events
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/manage_gallery"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Gallery
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/news"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage News
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/manage_obe"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage OBE
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/research"
                      class="block rounded px-3 py-2 transition duration-300 hover:scale-105 hover:bg-yellow-400"
                    >
                      Manage Research
                    </NuxtLink>
                  </li>

                  <li>
                    <NuxtLink
                      to="/admin/super-admin/socials"
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
import { ref } from 'vue'
import { signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { useFirebaseAuth } from 'vuefire'
import { ChevronRight } from 'lucide-vue-next'

const auth = useFirebaseAuth()
const router = useRouter()

const manageOpen = ref(true)

const logout = async () => {
  if (auth) {
    await signOut(auth)
    router.push('/login')
  }
}
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

/* keep color consistent with faculty sidebar */
.bg-maroon { background-color: #740505; }
</style>
