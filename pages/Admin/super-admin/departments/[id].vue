<template>
  <div class="p-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-maroon">
        {{ departmentName }} - Degree Programs
      </h1>

      <!-- Edit Toggle -->
      <button
        @click="toggleEditMode"
        class="px-4 py-2 border rounded text-white flex items-center space-x-2"
        :class="editMode ? 'bg-red-500 hover:bg-red-600' : 'bg-maroon hover:bg-red-600'"
      >
        <Pen class="w-5 h-5" />
        <span>{{ editMode ? 'Done' : 'Edit' }}</span>
      </button>
    </div>

    <!-- 🧑 Department Head Display -->
    <div class="bg-white rounded shadow p-4 mb-6 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <img
          :src="departmentHead?.photo || '/placeholder.png'"
          alt="Head Admin"
          class="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <p class="font-semibold">{{ departmentHead?.email || 'No Head Admin Assigned' }}</p>
          <span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
            Department Head
          </span>
        </div>
      </div>
      <div class="flex space-x-2">
        <button
          v-if="departmentHead"
          @click="removeHeadAdmin"
          class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Remove
        </button>
        <button
          @click="showAssignModal = true"
          class="bg-maroon hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Assign
        </button>
      </div>
    </div>

    <!-- Add Degree Program -->
    <button
      @click="showAddModal = true"
      class="bg-maroon text-white px-4 py-2 rounded mb-4 hover:bg-red-600"
    >
      + Add Degree Program
    </button>

    <!-- Degree Program Table -->
    <div class="bg-white rounded shadow-md">
      <table class="table-auto w-full border-collapse text-left">
        <thead>
          <tr class="bg-gray-100 border-b">
            <th class="px-6 py-4">Program Name</th>
            <th v-if="editMode" class="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="program in degreePrograms"
            :key="program.id"
            class="border-b hover:bg-gray-50"
          >
            <td class="px-6 py-4 flex items-center">
              <span
                v-if="!program.editing"
                class="cursor-pointer text-maroon hover:underline flex items-center"
              >
                {{ program.name }}
                <button
                  v-if="editMode"
                  @click="program.editing = true"
                  class="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <Pen class="w-4 h-4" />
                </button>
              </span>
              <input
                v-else
                v-model="program.newName"
                class="border rounded px-2 py-1 w-full"
                @keyup.enter="updateProgramName(program)"
                @blur="program.editing = false"
              />
            </td>
            <td v-if="editMode" class="px-6 py-4">
              <button
                @click="confirmDelete(program.id)"
                class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Program Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white p-6 rounded shadow-lg w-96">
        <h2 class="text-lg font-bold mb-4">Add Degree Program</h2>
        <input
          v-model="newProgram"
          type="text"
          class="border rounded w-full px-3 py-2 mb-4"
          placeholder="Enter Program Name"
        />
        <div class="flex justify-end space-x-2">
          <button
            @click="showAddModal = false"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="addDegreeProgram"
            class="px-4 py-2 bg-maroon text-white rounded hover:bg-red-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- Assign Head Admin Modal -->
    <div
      v-if="showAssignModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white p-6 rounded shadow-lg w-96">
        <h2 class="text-lg font-bold mb-4">Assign Head Admin</h2>
        <div class="relative mb-4">
          <input
            v-model="searchQuery"
            @input="filterUsers"
            @focus="dropdownVisible = true"
            @blur="hideDropdown"
            type="text"
            placeholder="Search user"
            class="w-full border rounded px-3 py-2"
          />
          <ul
            v-if="dropdownVisible && filteredUsers.length"
            class="absolute z-10 w-full bg-white border mt-1 rounded shadow"
          >
            <li
              v-for="user in filteredUsers"
              :key="user.id"
              @mousedown.prevent="selectUser(user)"
              class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {{ user.fullName }}
            </li>
          </ul>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            @click="showAssignModal = false"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="assignHeadAdmin"
            class="px-4 py-2 bg-maroon text-white rounded hover:bg-red-600"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Pen from '@/components/Icons/Pen.vue';
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';

 definePageMeta({
     middleware: ['auth'],
     roles: ['super_admin'],
    layout: "super-admin",
  });

const db = getFirestore();
const route = useRoute();
const departmentId = route.params.id;

const departmentName = ref('');
const degreePrograms = ref([]);
const departmentHead = ref(null);
const showAddModal = ref(false);
const showAssignModal = ref(false);
const newProgram = ref('');
const editMode = ref(false);
const searchQuery = ref('');
const selectedUser = ref(null);
const users = ref([]);
const filteredUsers = ref([]);
const dropdownVisible = ref(false);

const fetchDegreePrograms = async () => {
  const deptRef = doc(db, 'departments', departmentId);
  const deptSnap = await getDoc(deptRef);
  const deptData = deptSnap.data();
  departmentName.value = deptData.name;
  departmentHead.value = deptData.headAdmin || null;

  const programsSnapshot = await getDocs(collection(db, 'departments', departmentId, 'degreePrograms'));
  degreePrograms.value = programsSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    editing: false,
    newName: doc.data().name
  }));

  const usersSnapshot = await getDocs(collection(db, 'users'));
  users.value = usersSnapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(user =>
    user.role !== 'Super Admin' && // ⛔ exclude Super Admins
    user.isActive !== false // ✅ include only active users if applicable
  );

};

const addDegreeProgram = async () => {
  if (!newProgram.value.trim()) return;
  await addDoc(collection(db, 'departments', departmentId, 'degreePrograms'), { name: newProgram.value });
  newProgram.value = '';
  showAddModal.value = false;
  fetchDegreePrograms();
};

const updateProgramName = async (program) => {
  if (!program.newName.trim() || program.newName === program.name) return;
  await updateDoc(doc(db, 'departments', departmentId, 'degreePrograms', program.id), { name: program.newName });
  program.name = program.newName;
  program.editing = false;
};

const confirmDelete = async (programId) => {
  if (!window.confirm('Are you sure you want to delete this program?')) return;
  await deleteDoc(doc(db, 'departments', departmentId, 'degreePrograms', programId));
  fetchDegreePrograms();
};

const toggleEditMode = () => {
  editMode.value = !editMode.value;
};

const removeHeadAdmin = async () => {
  const userRef = doc(db, 'users', departmentHead.value.id);
  await updateDoc(userRef, { role: 'Faculty', departmentId: null });
  await updateDoc(doc(db, 'departments', departmentId), { headAdmin: null });
  fetchDegreePrograms();
};

const assignHeadAdmin = async () => {
  if (!selectedUser.value) return;

  const deptRef = doc(db, 'departments', departmentId);
  const deptSnap = await getDoc(deptRef);
  const oldHead = deptSnap.data().headAdmin;

  if (oldHead?.id) {
    await updateDoc(doc(db, 'users', oldHead.id), { role: 'Faculty', departmentId: null });
  }

  await updateDoc(doc(db, 'users', selectedUser.value.id), { role: 'Head Admin', departmentId });
  await updateDoc(deptRef, {
    headAdmin: {
      id: selectedUser.value.id,
      name: selectedUser.value.fullName,
      fullName: selectedUser.value.fullName,
      email: selectedUser.value.email,
      photo: selectedUser.value.photo || '',
      specialization: selectedUser.value.specialization || '',
      personalEmail: selectedUser.value.personalEmail || '',
      contact: selectedUser.value.contact || '',
      websites: selectedUser.value.websites || [],
      education: selectedUser.value.education || '',
      educationHtml: selectedUser.value.educationHtml || '',
      designation: 'Department Head',
    }
  });

  selectedUser.value = null;
  searchQuery.value = '';
  showAssignModal.value = false;
  fetchDegreePrograms();
};

const filterUsers = () => {
  const query = searchQuery.value.toLowerCase();
  filteredUsers.value = users.value.filter(user => user.fullName.toLowerCase().includes(query));
};

const selectUser = (user) => {
  selectedUser.value = user;
  searchQuery.value = user.fullName;
  dropdownVisible.value = false;
};

const hideDropdown = () => {
  setTimeout(() => (dropdownVisible.value = false), 200);
};

onMounted(fetchDegreePrograms);
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
</style>

