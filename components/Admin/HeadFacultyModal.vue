<!-- components/Admin/HeadFacultyModal.vue -->
<template>
  <!-- Slide-in side panel like AddFacultyStaffModal -->
  <Transition name="faculty-panel">
    <div v-if="show" class="fixed inset-0 z-50 flex">
      <!-- Overlay -->
      <div class="flex-1 bg-black/40" @click="emitClose" />

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
            @click="emitClose"
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
  <!-- ↓ reduced from max-h-64 to max-h-40 so footer doesn’t get pushed down -->
  <div class="max-h-40 space-y-2 overflow-y-auto pr-1">
    <template v-if="filteredUsers.length">
      <button
        v-for="user in filteredUsers"
        :key="user.id"
        type="button"
        class="flex w-full items-center rounded-lg border px-3 py-2 text-left transition
               hover:bg-neutral-50"
        :class="selectedUser && selectedUser.id === user.id
          ? 'border-red-900 bg-red-50/80 ring-1 ring-red-200'
          : 'border-gray-200'"
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


        <!-- Footer: designation + type + actions -->
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
                  {{ selectedDesignation || 'Select Designation' }}
                </span>
                <ChevronDown class="h-4 w-4 text-gray-500" />
              </button>

              <div
                v-if="isDesignationOpen"
                class="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-md
                       border border-gray-200 bg-white shadow-lg"
              >
                <button
                  v-for="d in localDesignations"
                  :key="d"
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  @click="selectDesignation(d)"
                >
                  {{ d }}
                </button>
              </div>
            </div>
          </div>

          <!-- Type -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Type:
            </label>
            <select
              v-model="facultyType"
              class="w-full rounded-md border border-gray-300 bg-gray-50
                     px-3 py-2 text-sm text-gray-700
                     focus:border-red-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-900"
            >
              <option value="Core">Core</option>
              <option value="Affiliate">Affiliate</option>
            </select>
          </div>

          <!-- Home department (only when Affiliate) -->
          <div v-if="facultyType === 'Affiliate'">
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Home department:
            </label>
            <input
              v-model="homeDepartment"
              type="text"
              placeholder="e.g., Department of Agricultural Engineering"
              class="w-full rounded-md border border-gray-300 bg-gray-50
                     px-3 py-2 text-sm text-gray-700
                     focus:border-red-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-900"
            />
            <p class="mt-1 text-xs text-gray-500">
              Enter the member’s primary department outside this one.
            </p>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-3 pt-2">
            <UiButton
              type="button"
              class="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              @click="emitClose"
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

<script setup>
/**
 * HeadFacultyModal.vue (updated to match AddFacultyStaffModal style)
 * - Side panel with search, user list, designation, type, and home department.
 */
import { ref, computed } from 'vue'
import {
  getFirestore, doc, getDoc, updateDoc, arrayUnion,
} from 'firebase/firestore'
import UserSearchInput from '@/components/Admin/UserSearchInput.vue'
import { useUserSearchAndFilter } from '@/composables/useUserSearchAndFilter'
import { ChevronDown, X } from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, required: true },
  departmentId: { type: String, required: true },
  users: { type: Array, default: () => [] },
  designations: {
    type: Array,
    default: () => [
      'Instructor I', 'Instructor II', 'Instructor III',
      'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
      'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
      'Professor I', 'Professor II', 'Professor III',
      'Part-time Instructor',
    ],
  },
})

const emit = defineEmits(['close', 'added'])

const db = getFirestore()

/* Search (shared composable like AddFacultyStaffModal) */
const usersSource = computed(() => props.users || [])
const { searchQuery, filteredUsers } = useUserSearchAndFilter(usersSource)

/* Local state */
const selectedUser = ref(null)
const facultyType = ref('Core')
const homeDepartment = ref('')

const selectedDesignation = ref('')
const isDesignationOpen = ref(false)

const localDesignations = computed(() => props.designations || [])

/* UI helpers */
const toggleDesignationDropdown = () => {
  isDesignationOpen.value = !isDesignationOpen.value
}

const selectUser = (user) => {
  selectedUser.value = user
}

const selectDesignation = (d) => {
  selectedDesignation.value = d
  isDesignationOpen.value = false
}

/* Button enabled only when everything is valid */
const canSave = computed(() => {
  if (!selectedUser.value || !selectedUser.value.id) return false
  if (!selectedDesignation.value) return false
  if (facultyType.value === 'Affiliate' && !homeDepartment.value.trim()) return false
  return true
})

const resetState = () => {
  searchQuery.value = ''
  selectedUser.value = null
  selectedDesignation.value = ''
  facultyType.value = 'Core'
  homeDepartment.value = ''
  isDesignationOpen.value = false
}

const emitClose = () => {
  resetState()
  emit('close')
}

/* Firestore write (same logic as your original HeadFacultyModal) */
const addFacultyOrStaff = async () => {
  if (!canSave.value) return

  const userId = selectedUser.value.id
  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) return

  const userData = userSnap.data()

  const newMember = {
    id: userId,
    name: userData.fullName || 'Unnamed',
    designation: selectedDesignation.value,
    memberType: facultyType.value, // 'Core' or 'Affiliate'
    homeDepartment: facultyType.value === 'Affiliate'
      ? homeDepartment.value.trim()
      : '',
    photo: userData.photo || '/placeholder.png',
    email: userData.email || 'N/A',
    specialization: userData.specialization || 'N/A',
    status: 'active',
  }

  const depRef = doc(db, 'departments', props.departmentId)

  if (selectedDesignation.value === 'Department Head') {
    // assign as head admin
    await updateDoc(depRef, { headAdmin: newMember })
    await updateDoc(userRef, { departmentId: props.departmentId })
  } else {
    // add to staff array
    await updateDoc(depRef, { staff: arrayUnion(newMember) })
    await updateDoc(userRef, {
      departments: arrayUnion(props.departmentId),
      status: 'active',
    })
  }

  emit('added', newMember)
  emitClose()
  alert('Faculty/Staff added successfully!')
}
</script>

<style scoped>
/* slide-in animation for the whole panel (same as AddFacultyStaffModal) */
.faculty-panel-enter-active,
.faculty-panel-leave-active {
  transition: opacity 0.25s ease;
}

.faculty-panel-enter-from,
.faculty-panel-leave-to {
  opacity: 0;
}

.faculty-panel-enter-active aside,
.faculty-panel-leave-active aside {
  transition: transform 0.25s ease;
}

.faculty-panel-enter-from aside,
.faculty-panel-leave-to aside {
  transform: translateX(100%);
}
</style>
