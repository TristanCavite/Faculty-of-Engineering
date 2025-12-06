<!-- components/CreateAccountModal.vue -->
<template>
  <main class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="w-full max-w-2xl rounded-lg bg-white p-8 text-black shadow-lg">
      <h2 class="mb-4 text-center text-xl font-semibold">Create Account</h2>

      <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
        <!-- Full Name -->
        <div>
          <label for="full_name" class="block text-sm font-medium">Full Name</label>
          <input
            id="full_name"
            v-model.trim="form.fullName"
            type="text"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Full Name"
            required
          />
          <p v-if="errors.fullName" class="mt-1 text-xs text-red-600">{{ errors.fullName }}</p>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium">Email</label>
          <input
            id="email"
            v-model.trim="form.email"
            type="email"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Email"
            required
          />
          <p v-if="errors.email" class="mt-1 text-xs text-red-600">{{ errors.email }}</p>
        </div>

        <!-- Title (acts as role selector for this modal) -->
        <div>
          <label for="title" class="block text-sm font-medium">Title / Role</label>
          <select
            id="title"
            v-model="form.title"
            @change="handleTitleChange"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="Faculty Member">Faculty Member</option>
            <option value="Chair/Head of Department">Chair/Head of Department</option>
          </select>
          <p v-if="errors.title" class="mt-1 text-xs text-red-600">{{ errors.title }}</p>
        </div>

        <!-- Department (only for Head of Department) -->
        <div v-if="isHeadDepartment">
          <label for="department" class="block text-sm font-medium">Department</label>
          <select
            id="department"
            v-model="form.departmentId"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Select Department</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">
              {{ dept.name }}
            </option>
          </select>
          <p v-if="errors.departmentId" class="mt-1 text-xs text-red-600">{{ errors.departmentId }}</p>
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Password (min 6 chars)"
            required
          />
          <p v-if="errors.password" class="mt-1 text-xs text-red-600">{{ errors.password }}</p>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirm_password" class="block text-sm font-medium">Confirm Password</label>
          <input
            id="confirm_password"
            v-model="form.confirmPassword"
            type="password"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Confirm Password"
            required
          />
          <p v-if="errors.confirmPassword" class="mt-1 text-xs text-red-600">{{ errors.confirmPassword }}</p>
        </div>

        <!-- Errors from server -->
        <p v-if="serverError" class="text-sm text-red-600">{{ serverError }}</p>

        <!-- Actions -->
        <div class="mt-6 flex gap-3">
          <UiButton
            type="button"
            class="w-1/2 rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
            :disabled="submitting"
            @click="emit('close')"
          >
            Cancel
          </UiButton>

          <UiButton
            type="submit"
            class="w-1/2 rounded bg-red-900 px-4 py-2 text-white hover:bg-red-800 disabled:opacity-50"
            :disabled="submitting"
          >
            <span v-if="submitting">Creating…</span>
            <span v-else>Create Account</span>
          </UiButton>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFirebaseApp, useFirestore } from 'vuefire'
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getApps, initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

const emit = defineEmits<{ (e: 'close'): void }>()
const db = useFirestore()
const vuefireApp = useFirebaseApp()

// List of departments for Head Admin assignment
const departments = ref<{ id: string; name: string }[]>([])

// UI/logic flags
const isHeadDepartment = ref(false)
const submitting = ref(false)
const serverError = ref('')

// Form state
const form = ref({
  fullName: '',
  email: '',
  // We keep the same key "title" to minimize changes elsewhere in your app.
  // Options: "Faculty Member" | "Chair/Head of Department"
  title: 'Faculty Member',
  departmentId: '',
  password: '',
  confirmPassword: '',
  photo: '',
})

// Field-level errors
const errors = ref<Record<string, string>>({})

// Load departments once
onMounted(async () => {
  const snap = await getDocs(collection(db, 'departments'))
  departments.value = snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name }))
})

// Toggle department UI only for Head Admin
function handleTitleChange() {
  isHeadDepartment.value = form.value.title === 'Chair/Head of Department'
}

// Basic client-side validation
function validate(): boolean {
  errors.value = {}
  if (!form.value.fullName.trim()) errors.value.fullName = 'Full name is required.'
  if (!form.value.email.trim()) errors.value.email = 'Email is required.'
  if (isHeadDepartment.value && !form.value.departmentId) errors.value.departmentId = 'Pick a department.'
  if (!form.value.password || form.value.password.length < 6) errors.value.password = 'Min 6 characters.'
  if (form.value.password !== form.value.confirmPassword) errors.value.confirmPassword = 'Passwords do not match.'
  return Object.keys(errors.value).length === 0
}

/**
 * Use a SECONDARY Firebase app so creating an Auth user does NOT replace
 * the currently signed-in Super Admin in the main app.
 */
async function getSecondaryAuth() {
  const name = 'secondary-admin'
  let secondary: FirebaseApp
  const existing = getApps().find(a => a.name === name)
  if (existing) secondary = existing
  else secondary = initializeApp(vuefireApp.options, name)
  const auth = getAuth(secondary)
  return {
    auth,
    async cleanup() {
      try {
        await deleteApp(secondary)
      } catch {}
    },
  }
}

// Map UI "title" to canonical role key used across your app
function mapTitleToRole(title: string): 'faculty' | 'head_admin' {
  if (title === 'Chair/Head of Department') return 'head_admin'
  return 'faculty'
}

async function onSubmit() {
  serverError.value = ''
  if (submitting.value) return
  if (!validate()) return

  submitting.value = true
  try {
    // If creating a Head Admin, make sure the selected department has no existing head
    if (isHeadDepartment.value && form.value.departmentId) {
      const depRef = doc(db, 'departments', form.value.departmentId)
      const depSnap = await getDoc(depRef)
      const data = depSnap.exists() ? (depSnap.data() as any) : null
      if (data?.headAdmin?.id) {
        throw new Error('This department already has a Head Admin.')
      }
    }

    // Create Auth user on a secondary app to avoid switching current session
    const { auth, cleanup } = await getSecondaryAuth()
    const cred = await createUserWithEmailAndPassword(auth, form.value.email, form.value.password)

    // Derive role from the Title / Role select
    const role = mapTitleToRole(form.value.title)

    // Write to Firestore users collection
    await addDoc(collection(db, 'users'), {
      uid: cred.user.uid,
      fullName: form.value.fullName.trim(),
      email: form.value.email.trim(),
      role, // 'faculty' | 'head_admin'
      departmentId: isHeadDepartment.value ? form.value.departmentId : null,
      status: 'active',
      photo: form.value.photo || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // If Head Admin, stamp department document with headAdmin info
    if (role === 'head_admin' && form.value.departmentId) {
      await updateDoc(doc(db, 'departments', form.value.departmentId), {
        headAdmin: {
          id: cred.user.uid,
          name: form.value.fullName.trim(),
          email: form.value.email.trim(),
          designation: 'Head Admin',
          photo: form.value.photo || '',
          status: 'active',
        },
        updatedAt: serverTimestamp(),
      })
    }

    await cleanup()
    emit('close')
  } catch (e: any) {
    serverError.value = e?.message || 'Failed to create account.'
  } finally {
    submitting.value = false
  }
}
</script>
