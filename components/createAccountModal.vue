<template>
    <main class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="w-full max-w-2xl p-8 text-black bg-white rounded-lg shadow-lg">
            <h2 class="mb-4 text-xl font-semibold text-center ">Create Account</h2>
            <form @submit.prevent="submitForm">
                <!-- Full Name -->
                <div class="mb-4">
                <label for="full_name" class="block text-sm font-medium">Full Name</label>
                <input
                    v-model="form.fullName"
                    type="text"
                    id="full_name"
                    class="w-full px-3 py-2 mt-1 border border-gray-300 rounded"
                    placeholder="Full Name"
                />
                <p v-if="errors.fullName" class="mt-1 text-xs text-black">{{ errors.fullName }}</p>
                </div>

                <!-- Email -->
                <div class="mb-4">
                <label for="email" class="block text-sm font-medium">Email</label>
                <input
                    v-model="form.email"
                    type="email"
                    id="email"
                    class="w-full px-3 py-2 mt-1 border border-gray-300 rounded"
                    placeholder="Email"
                />
                <p v-if="errors.email" class="mt-1 text-xs text-black">{{ errors.email }}</p>
                </div>

                <!-- Title -->
                <div class="mb-4">
                <label for="title" class="block text-sm font-medium">Title</label>
                <select
                    v-model="form.title"
                    id="title"
                    @change="handleTitleChange"
                    class="w-full px-3 py-2 mt-1 text-black border border-gray-300 rounded"
                >
                    <option value="Faculty Member">Faculty Member</option>
                    <option value="Chair/Head of Department">Chair/Head of Department</option>
                </select>
                <p v-if="errors.title" class="mt-1 text-xs ">{{ errors.title }}</p>
                </div>

                <!-- Department (Only if user is Head of Department) -->
                <div v-if="isHeadDepartment" class="mb-4">
                <label for="department" class="block text-sm font-medium">Department</label>
                <select
                    v-model="form.departmentId"
                    id="department"
                    class="w-full px-3 py-2 mt-1 border border-gray-300 rounded"
                >
                    <option value="">Select Department</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                    {{ dept.name }}
                    </option>
                </select>
                <p v-if="errors.departmentId" class="mt-1 text-xs text-black">{{ errors.departmentId }}</p>
                </div>

                <!-- Password -->
                <div class="mb-4">
                <label for="password" class="block text-sm font-medium">Password</label>
                <input
                    v-model="form.password"
                    type="password"
                    id="password"
                    class="w-full px-3 py-2 mt-1 border border-gray-300 rounded"
                    placeholder="Password"
                />
                <p v-if="errors.password" class="mt-1 text-xs text-black">{{ errors.password }}</p>
                </div>

                <!-- Confirm Password -->
                <div class="mb-4">
                <label for="confirm_password" class="block text-sm font-medium">Confirm Password</label>
                <input
                    v-model="form.confirmPassword"
                    type="password"
                    id="confirm_password"
                    class="w-full px-3 py-2 mt-1 border border-gray-300 rounded"
                    placeholder="Confirm Password"
                />
                <p v-if="errors.confirmPassword" class="mt-1 text-xs text-black">{{ errors.confirmPassword }}</p>
                </div>

                <UiButton
                    type="submit"
                    class="w-full py-2 text-white transition bg-red-900 rounded hover:bg-red-800 "
                    @click="submitForm, $emit('close')"
                    >
                    Create Account
                </UiButton>
                <UiButton
                    @click="$emit('close')"
                    class="w-full py-2 mt-4 text-white transition bg-gray-900 rounded hover:bg-gray-800"
                >
                    Cancel
                </UiButton>
            </form>
        </div>
    </main>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import {
  doc,
  getFirestore,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";

definePageMeta({
  layout: "super-admin",
  middleware: "auth",
});


const db = getFirestore();
const departments = ref([]);
const form = ref({
  fullName: "",
  email: "",
  title: "Faculty Member",
  departmentId: "",
  password: "",
  confirmPassword: "",
  photo: "",
});
const errors = ref({});
const isHeadDepartment = ref(false);

// Fetch departments from Firestore
const fetchDepartments = async () => {
  const departmentsCollection = collection(db, "departments");
  const snapshot = await getDocs(departmentsCollection);
  departments.value = snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
  }));
};

// Handle dropdown change
const handleTitleChange = () => {
  isHeadDepartment.value = form.value.title === "Chair/Head of Department";
};

// Form submit logic
const submitForm = async () => {
  try {
    // Validate head admin uniqueness
    if (isHeadDepartment.value && form.value.departmentId) {
      const departmentRef = doc(db, "departments", form.value.departmentId);
      const departmentSnap = await getDoc(departmentRef);

      if (departmentSnap.exists()) {
        const data = departmentSnap.data();
        if (data.headAdmin && data.headAdmin.id) {
          alert("This department already has a Head Admin assigned.");
          return;
        }
      }
    }

    // Create user in Firebase Auth
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      form.value.email,
      form.value.password
    );
    const user = userCredential.user;

    // Save to users collection
    await setDoc(doc(db, "users", user.uid), {
      fullName: form.value.fullName,
      email: form.value.email,
      role: isHeadDepartment.value ? "Head Admin" : "Faculty",
      departmentId: isHeadDepartment.value ? form.value.departmentId : null,
      status: "active",
      photo: form.value.photo || "",
    });

    // Update department document if Head Admin
    if (isHeadDepartment.value) {
      const departmentRef = doc(db, "departments", form.value.departmentId);
      await updateDoc(departmentRef, {
        headAdmin: {
          id: user.uid,
          name: form.value.fullName,
          email: form.value.email,
          designation: "Head Admin",
          photo: form.value.photo || "",
          status: "active",
        },
      });
    }

    alert("Account created successfully!");
  } catch (err) {
    console.error("Error:", err.message);
    alert("Error: " + err.message);
  }
};
onMounted(fetchDepartments);
</script>