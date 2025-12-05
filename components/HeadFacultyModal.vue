<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="emitClose"
  >
    <div class="w-full max-w-md rounded bg-white p-6 shadow-lg">
      <h2 class="mb-4 text-lg font-bold">Add Faculty/Staff</h2>

      <!-- Search with suggestions -->
      <div class="relative mb-4">
        <div class="relative">
          <input
            v-model="searchQuery"
            @focus="dropdownVisible = true"
            @input="filterUsers"
            @blur="hideDropdown"
            type="text"
            placeholder="Search Faculty"
            class="w-full rounded border px-3 py-2 pl-10"
          />
          <Search class="absolute left-3 top-2 h-5 w-5 text-gray-500" />
        </div>

        <!-- Suggestions (scrollable) -->
        <ul
          v-if="dropdownVisible && filteredUsers.length"
          class="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded border bg-white shadow"
        >
          <li
            v-for="user in filteredUsers"
            :key="user.id"
            :class="[
              'cursor-pointer px-3 py-2 hover:bg-gray-100',
              user.status === 'inactive' ? 'bg-yellow-100' : ''
            ]"
            @mousedown="selectUser(user)"
            title="Click to select"
          >
            {{ user.name }}
            <span v-if="user.status === 'inactive'" class="text-red-500">(Inactive)</span>
          </li>
        </ul>
      </div>

      <!-- Designation (custom dropdown, scrollable) -->
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium">Designation:</label>

        <div class="relative" ref="designationMenuRef">
          <button
            type="button"
            @click="isDesignationOpen = !isDesignationOpen"
            class="flex w-full items-center justify-between rounded border px-3 py-2"
          >
            <span class="truncate">
              {{ selectedUser.designation || 'Select Designation' }}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <ul
            v-if="isDesignationOpen"
            class="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded border bg-white shadow"
          >
            <li
              v-for="d in localDesignations"
              :key="d"
              class="cursor-pointer px-3 py-2 hover:bg-gray-100"
              @click="selectDesignation(d)"
            >
              {{ d }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Type of faculty/staff -->
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium">Type:</label>
        <select v-model="facultyType" class="w-full rounded border px-3 py-2">
          <option value="Core">Core</option>
          <option value="Affiliate">Affiliate</option>
        </select>
      </div>

      <!-- Home department (only when Affiliate) -->
      <div v-if="facultyType === 'Affiliate'" class="mb-2">
        <label class="mb-1 block text-sm font-medium">Home department:</label>
        <input
          v-model="homeDepartment"
          type="text"
          placeholder="e.g., Department of Agricultural Engineering"
          class="w-full rounded border px-3 py-2"
        />
        <p class="mt-1 text-xs text-gray-500">
          Enter the member’s primary department outside this one.
        </p>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex justify-end gap-2">
        <button @click="emitClose" class="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400">
          Cancel
        </button>
        <button @click="addFacultyOrStaff" class="rounded bg-maroon px-4 py-2 text-white hover:bg-red-600">
          Add
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * HeadFacultyModal.vue
 * - Search a user, pick designation, pick type (Core/Affiliate), optional home department
 * - Emits:
 *    - 'close'   -> when modal should be closed
 *    - 'added'   -> when a member is added successfully (payload: newMember)
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  getFirestore, doc, getDoc, updateDoc, arrayUnion,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Search from '@/components/Icons/Search.vue';

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
});
const emit = defineEmits(['close', 'added']);

const db = getFirestore();
const auth = getAuth();

const localDesignations = computed(() => props.designations);

// --- UI/state ---
const searchQuery = ref('');
const dropdownVisible = ref(false);

const isDesignationOpen = ref(false);
const designationMenuRef = ref(null);

const selectedUser = ref({});
const filteredUsers = ref([]);

// New: type + home department
const facultyType = ref('Core');          // 'Core' | 'Affiliate'
const homeDepartment = ref('');           // only used when Affiliate

watch(() => [props.users, searchQuery.value], filterUsers, { deep: true });

function filterUsers() {
  const q = (searchQuery.value || '').toLowerCase().trim();
  filteredUsers.value = (props.users || [])
    .filter(u => (u?.name || '').toLowerCase().includes(q));
}

function selectUser(user) {
  selectedUser.value = { ...user };
  searchQuery.value = user.name;
  filteredUsers.value = [];
}

function selectDesignation(d) {
  selectedUser.value = { ...selectedUser.value, designation: d };
  isDesignationOpen.value = false;
}

function hideDropdown() {
  setTimeout(() => (dropdownVisible.value = false), 150);
}

// click-outside for the designation dropdown
function handleGlobalClick(e) {
  if (!isDesignationOpen.value) return;
  const el = designationMenuRef.value;
  if (el && e.target instanceof Node && !el.contains(e.target)) {
    isDesignationOpen.value = false;
  }
}
onMounted(() => document.addEventListener('click', handleGlobalClick, true));
onBeforeUnmount(() => document.removeEventListener('click', handleGlobalClick, true));

function emitClose() {
  // reset local state when closing
  searchQuery.value = '';
  selectedUser.value = {};
  filteredUsers.value = [];
  isDesignationOpen.value = false;
  dropdownVisible.value = false;
  facultyType.value = 'Core';
  homeDepartment.value = '';
  emit('close');
}

async function addFacultyOrStaff() {
  if (!selectedUser.value.id || !props.departmentId) {
    alert('Select a valid user.');
    return;
  }
  if (!selectedUser.value.designation) {
    alert('Please select a designation.');
    return;
  }
  if (facultyType.value === 'Affiliate' && !homeDepartment.value.trim()) {
    alert('Please enter the home department for affiliate members.');
    return;
  }

  const userRef = doc(db, 'users', selectedUser.value.id);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();

  // Build the member object stored in this department
  const newMember = {
    id: selectedUser.value.id,
    name: userData.fullName || 'Unnamed',
    designation: selectedUser.value.designation,
    memberType: facultyType.value, // 'Core' or 'Affiliate'
    homeDepartment: facultyType.value === 'Affiliate' ? homeDepartment.value.trim() : '',
    photo: userData.photo || '/placeholder.png',
    email: userData.email || 'N/A',
    specialization: userData.specialization || 'N/A',
    status: 'active',
  };

  const depRef = doc(db, 'departments', props.departmentId);

  if (selectedUser.value.designation === 'Department Head') {
    // If you ever allow assigning head here
    await updateDoc(depRef, { headAdmin: newMember });
    await updateDoc(userRef, { departmentId: props.departmentId });
  } else {
    await updateDoc(depRef, { staff: arrayUnion(newMember) });
    await updateDoc(userRef, {
      departments: arrayUnion(props.departmentId),
      status: 'active',
    });
  }

  emit('added', newMember);
  emitClose();
  alert('Faculty/Staff added successfully!');
}
</script>
