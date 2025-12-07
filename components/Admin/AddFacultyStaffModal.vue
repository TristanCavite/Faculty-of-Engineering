<!-- components/Admin/AddFacultyStaffModal.vue -->
<template>
  <!-- Transition for overlay + side panel -->
  <Transition name="faculty-panel">
    <div v-if="open" class="fixed inset-0 z-40 flex">
      <!-- Overlay -->
      <div class="flex-1 bg-black/40" @click="handleCancel" />

      <!-- Side panel -->
      <aside
        class="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
      >
        <!-- Header -->
        <header class="flex items-center justify-between border-b px-6 py-4">
          <h2 class="text-lg font-semibold text-gray-900">
            Add Faculty/Staff
          </h2>

          <button
            type="button"
            class="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            @click="handleCancel"
          >
            <X class="h-5 w-5" />
          </button>
        </header>

        <!-- Search -->
        <section class="border-b px-6 py-4">
          <UserSearchInput
            v-model="searchQuery"
            placeholder="Search faculty by name or email"
            class="w-full"
          />
        </section>

        <!-- User list (max ~3 cards, scrollable) -->
        <section class="px-6 py-4">
          <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
            <template v-if="filteredUsers.length">
              <button
                v-for="user in filteredUsers"
                :key="user.id"
                type="button"
                class="flex w-full items-center rounded-lg border px-3 py-2 text-left transition
                       hover:bg-neutral-50"
                :class="
                  selectedUser && selectedUser.id === user.id
                    ? 'border-red-900 bg-red-50/80 ring-1 ring-red-200'
                    : 'border-gray-200'
                "
                @click="selectUser(user)"
              >
                <img
                  :src="user.photo || '/placeholder.png'"
                  alt="Profile"
                  class="mr-3 h-10 w-10 rounded-full object-cover"
                />

                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-gray-900">
                    {{ user.fullName || user.name || 'Unnamed' }}
                  </span>

                  <span class="text-xs text-gray-500">
                    {{ user.role || 'No role set' }}
                    <span
                      v-if="user.status === 'inactive'"
                      class="ml-1 text-red-500"
                    >
                      (Inactive)
                    </span>
                  </span>

                  <span class="text-xs text-gray-400">
                    {{ user.email }}
                  </span>
                </div>
              </button>
            </template>

            <p
              v-else
              class="py-8 text-center text-sm text-gray-500"
            >
              No users found for the current search.
            </p>
          </div>
        </section>

        <!-- Footer: designation + actions -->
        <footer class="space-y-4 border-t px-6 py-4">
          <!-- Designation -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Designation:
            </label>

            <div class="relative">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md border border-gray-300
                       bg-gray-50 px-3 py-2.5 text-left text-sm text-gray-700
                       focus:border-red-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-900"
                @click="toggleDesignationDropdown"
              >
                <span class="truncate">
                  {{ selectedDesignation || 'Please select designation' }}
                </span>
                <ChevronDown class="h-4 w-4 text-gray-500" />
              </button>

              <div
                v-if="designationOpen"
                class="absolute z-30 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
              >
                <button
                  v-for="designation in designations"
                  :key="designation"
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  @click="chooseDesignation(designation)"
                >
                  {{ designation }}
                </button>
              </div>
            </div>
          </div>

          <!-- Sub-Designation (only for Administrative Staff) -->
          <div v-if="selectedDesignation === 'Administrative Staff'">
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Specify Role:
            </label>
            <input
              v-model="subDesignation"
              type="text"
              placeholder="Please specify role"
              class="w-full rounded-md border border-gray-300 bg-gray-50
                     px-3 py-2 text-sm text-gray-700
                     focus:border-red-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-900"
            />
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-3 pt-2">
            <UiButton
              type="button"
              class="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              @click="handleCancel"
            >
              Cancel
            </UiButton>

            <UiButton
              type="button"
              class="rounded bg-red-900 px-4 py-2 text-sm font-medium text-white
                     hover:bg-red-950 disabled:cursor-not-allowed disabled:bg-red-300"
              :disabled="!canSave"
              @click="addFacultyOrStaff"
            >
              Save changes
            </UiButton>
          </div>
        </footer>
      </aside>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore'
import UserSearchInput from '@/components/Admin/UserSearchInput.vue'
import { useUserSearchAndFilter } from '@/composables/useUserSearchAndFilter'
import { ChevronDown, X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  users: any[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const db = getFirestore()

const usersSource = computed(() => props.users || [])
const { searchQuery, filteredUsers } = useUserSearchAndFilter(usersSource)

const selectedUser = ref<any | null>(null)
const selectedDesignation = ref<string>('')
const subDesignation = ref<string>('')

const designationOpen = ref(false)
const designations = [
  'College Dean',
  'College Secretary',
  'Department Head',
  'Administrative Staff',
]

const toggleDesignationDropdown = () => {
  designationOpen.value = !designationOpen.value
}

const selectUser = (user: any) => {
  selectedUser.value = user
}

const chooseDesignation = (value: string) => {
  selectedDesignation.value = value
  if (value !== 'Administrative Staff') {
    subDesignation.value = ''
  }
  designationOpen.value = false
}

const canSave = computed(
  () => !!(selectedUser.value && selectedUser.value.id && selectedDesignation.value),
)

const resetState = () => {
  searchQuery.value = ''
  selectedUser.value = null
  selectedDesignation.value = ''
  subDesignation.value = ''
  designationOpen.value = false
}

const close = () => {
  emit('update:open', false)
}

const handleCancel = () => {
  resetState()
  close()
}

const addFacultyOrStaff = async () => {
  if (!selectedUser.value?.id || !selectedDesignation.value) return

  const userId = selectedUser.value.id
  const userDocRef = doc(db, 'users', userId)
  const collegeDocRef = doc(db, 'college_faculty_staff', 'college-wide')

  const userDoc = await getDoc(userDocRef)
  if (!userDoc.exists()) return

  const userData: any = userDoc.data()

  const newStaff: any = {
    id: userId,
    name: userData.fullName || 'Unnamed',
    designation: selectedDesignation.value,
    photo: userData.photo || '/placeholder.png',
    email: userData.email || 'N/A',
    specialization: userData.specialization || 'N/A',
    status: 'active',
  }

  if (selectedDesignation.value === 'Administrative Staff') {
    newStaff.subDesignation = subDesignation.value || 'N/A'
  }

  if (selectedDesignation.value === 'College Dean') {
    await updateDoc(collegeDocRef, { collegeDean: newStaff })
  } else if (selectedDesignation.value === 'College Secretary') {
    await updateDoc(collegeDocRef, { collegeSecretary: newStaff })
  } else if (selectedDesignation.value === 'Department Head') {
    await updateDoc(collegeDocRef, { departmentHeads: arrayUnion(newStaff) })
  } else if (selectedDesignation.value === 'Administrative Staff') {
    await updateDoc(collegeDocRef, { adminStaff: arrayUnion(newStaff) })
  }

  await updateDoc(userDocRef, {
    status: 'active',
    collegeWide: true,
  })

  resetState()
  close()
}
</script>

<style scoped>
/* slide-in animation for the whole panel */
.faculty-panel-enter-active,
.faculty-panel-leave-active {
  transition: opacity 0.25s ease;
}

.faculty-panel-enter-from,
.faculty-panel-leave-to {
  opacity: 0;
}

/* slide the aside from the right */
.faculty-panel-enter-active aside,
.faculty-panel-leave-active aside {
  transition: transform 0.25s ease;
}

.faculty-panel-enter-from aside,
.faculty-panel-leave-to aside {
  transform: translateX(100%);
}
</style>
