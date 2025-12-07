<template>
  <div class="p-8">
    <div class="mb-6 flex items-center justify-between">
      <div class="flex flex-col">
        <span class="font-trajan text-4xl font-bold text-red-900"> Manage Departments </span>
        <span class="font-montserrat text-xs">
          Manage Departments and their Degree Programs
        </span>
      </div>

      <!-- Edit Toggle Button -->
      <button
        @click="toggleEditMode"
        class="flex items-center space-x-2 rounded border px-4 py-2 text-white"
        :class="editMode ? 'bg-red-500 hover:bg-red-600' : 'bg-maroon hover:bg-red-600'"
      >
        <Pen class="h-5 w-5" />
        <span>{{ editMode ? "Done" : "Edit" }}</span>
      </button>
    </div>

    <!-- Add Department Button -->
    <button
      @click="showAddModal = true"
      class="mb-4 rounded bg-maroon px-4 py-2 text-white hover:bg-red-600"
    >
      + Add Department
    </button>

    <!-- Department List -->
    <div class="rounded bg-white shadow-md">
      <table class="w-full table-auto border-collapse text-left">
        <thead>
          <tr class="border-b bg-gray-100">
            <th class="px-6 py-4">Department Name</th>
            <th v-if="editMode" class="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="department in departments"
            :key="department.id"
            class="border-b hover:bg-gray-50"
          >
            <td class="flex items-center px-6 py-4">
              <!-- Navigable Name -->
              <span
                v-if="!department.editing"
                class="flex cursor-pointer items-center text-maroon hover:underline"
                @click="goToDepartment(department.id)"
              >
                {{ department.name }}
                <button
                  v-if="editMode"
                  @click.stop="department.editing = true"
                  class="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <Pen class="h-4 w-4" />
                </button>
              </span>

              <!-- Input Field for Renaming -->
              <input
                v-else
                v-model="department.newName"
                class="w-full rounded border px-2 py-1"
                @keyup.enter="updateDepartmentName(department)"
                @blur="department.editing = false"
              />
            </td>

            <!-- Delete Button (Only in Edit Mode) -->
            <td v-if="editMode" class="px-6 py-4">
              <button
                @click="confirmDelete(department.id)"
                class="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Department Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="w-96 rounded bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-lg font-bold">Add Department</h2>
        <input
          v-model="newDepartment"
          type="text"
          class="mb-4 w-full rounded border px-3 py-2"
          placeholder="Enter Department Name"
        />
        <div class="flex justify-end space-x-2">
          <button
            @click="showAddModal = false"
            class="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="addDepartment"
            class="rounded bg-maroon px-4 py-2 text-white hover:bg-red-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import Pen from "@/components/Icons/Pen.vue"; // Import Pen icon from Icons folder
  import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    updateDoc,
  } from "firebase/firestore";
  import { onMounted, ref } from "vue";
  import { useRouter } from "vue-router";

  const db = getFirestore();
  const router = useRouter();
  const departments = ref([]);
  const editMode = ref(false);
  const showAddModal = ref(false);
  const newDepartment = ref("");

  definePageMeta({
    middleware: ["auth"],
    roles: ["super_admin"],
    layout: "super-admin",
  });

  // Fetch Departments from Firestore
  const fetchDepartments = async () => {
    const departmentCollection = collection(db, "departments");
    const departmentSnapshot = await getDocs(departmentCollection);
    departments.value = departmentSnapshot.docs.map((doc) => ({
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
    if (
      !window.confirm(
        "Are you sure you want to delete this department? All degree programs will also be deleted."
      )
    )
      return;

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
