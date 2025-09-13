<template>
    <div class="p-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-maroon">Department Management</h1>
  
        <!-- Edit Toggle Button -->
        <button
          @click="toggleEditMode"
          class="px-4 py-2 border rounded text-white flex items-center space-x-2"
          :class="editMode ? 'bg-red-500 hover:bg-red-600' : 'bg-maroon hover:bg-red-600'"
        >
          <Pen class="w-5 h-5" />
          <span>{{ editMode ? "Done" : "Edit" }}</span>
        </button>
      </div>
  
      <!-- Add Department Button -->
      <button
        @click="showAddModal = true"
        class="bg-maroon text-white px-4 py-2 rounded mb-4 hover:bg-red-600"
      >
        + Add Department
      </button>
  
      <!-- Department List -->
      <div class="bg-white rounded shadow-md">
        <table class="table-auto w-full border-collapse text-left">
          <thead>
            <tr class="bg-gray-100 border-b">
              <th class="px-6 py-4">Department Name</th>
              <th v-if="editMode" class="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="department in departments" :key="department.id" class="border-b hover:bg-gray-50">
              <td class="px-6 py-4 flex items-center">
                <!-- Navigable Name -->
                <span
                  v-if="!department.editing"
                  class="cursor-pointer text-maroon hover:underline flex items-center"
                  @click="goToDepartment(department.id)"
                >
                  {{ department.name }}
                  <button v-if="editMode" @click.stop="department.editing = true" class="ml-2 text-gray-500 hover:text-gray-700">
                    <Pen class="w-4 h-4" />
                  </button>
                </span>
  
                <!-- Input Field for Renaming -->
                <input
                  v-else
                  v-model="department.newName"
                  class="border rounded px-2 py-1 w-full"
                  @keyup.enter="updateDepartmentName(department)"
                  @blur="department.editing = false"
                />
              </td>
  
              <!-- Delete Button (Only in Edit Mode) -->
              <td v-if="editMode" class="px-6 py-4">
                <button
                  @click="confirmDelete(department.id)"
                  class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <!-- Add Department Modal -->
      <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-white p-6 rounded shadow-lg w-96">
          <h2 class="text-lg font-bold mb-4">Add Department</h2>
          <input v-model="newDepartment" type="text" class="border rounded w-full px-3 py-2 mb-4" placeholder="Enter Department Name" />
          <div class="flex justify-end space-x-2">
            <button @click="showAddModal = false" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
            <button @click="addDepartment" class="px-4 py-2 bg-maroon text-white rounded hover:bg-red-600">Add</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import { getFirestore, collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
  import { useRouter } from "vue-router";
  import Pen from "@/components/Icons/Pen.vue"; // Import Pen icon from Icons folder
  
  const db = getFirestore();
  const router = useRouter();
  const departments = ref([]);
  const editMode = ref(false);
  const showAddModal = ref(false);
  const newDepartment = ref("");
  
  definePageMeta({
    middleware: "auth",
    layout: "super-admin",
  });
  
  // Fetch Departments from Firestore
  const fetchDepartments = async () => {
    const departmentCollection = collection(db, "departments");
    const departmentSnapshot = await getDocs(departmentCollection);
    departments.value = departmentSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      editing: false,
      newName: doc.data().name,
    }));
  };
  
  // Navigate to Degree Programs inside the department
  const goToDepartment = (departmentId) => {
    router.push(`/Admin/super-admin/departments/${departmentId}`);

  };
  
  // Add New Department
  const addDepartment = async () => {
    if (!newDepartment.value.trim()) return;
    await addDoc(collection(db, "departments"), { name: newDepartment.value });
    newDepartment.value = "";
    showAddModal.value = false;
    fetchDepartments();
  };
  
  // Update Department Name
  const updateDepartmentName = async (department) => {
    if (!department.newName.trim() || department.newName === department.name) {
      department.editing = false;
      return;
    }
    await updateDoc(doc(db, "departments", department.id), { name: department.newName });
    department.name = department.newName;
    department.editing = false;
  };
  
  // Delete Department with Warning
  const confirmDelete = async (departmentId) => {
    if (!window.confirm("Are you sure you want to delete this department? All degree programs will also be deleted.")) return;
  
    // Delete all degree programs before deleting department
    const degreeProgramsCollection = collection(db, "departments", departmentId, "degreePrograms");
    const degreeProgramsSnapshot = await getDocs(degreeProgramsCollection);
    for (const program of degreeProgramsSnapshot.docs) {
      await deleteDoc(doc(db, "departments", departmentId, "degreePrograms", program.id));
    }
  
    // Delete the department
    await deleteDoc(doc(db, "departments", departmentId));
    fetchDepartments();
  };
  
  // Toggle Edit Mode
  const toggleEditMode = () => {
    editMode.value = !editMode.value;
  };
  
  // Fetch departments when component is mounted
  onMounted(fetchDepartments);
  </script>
  
  <style scoped>
  .text-maroon {
    color: #740505;
  }
  .bg-maroon {
    background-color: #740505;
  }
  </style>
  