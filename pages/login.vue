<template>
  <div
    class="flex items-center justify-center h-screen bg-center bg-cover"
    style="background-image: url('bg.png')"
  >
    <!-- Wrapper with Border -->
    <div class="w-full max-w-md p-6 bg-white border border-gray-300 rounded shadow-md">
      <!-- Centered Logo and Heading -->
      <div class="flex flex-col items-center my-6 space-y-2">
        <img src="/logoTab.png" alt="Logo" class="h-14" />
        <h1 class="text-2xl font-semibold tracking-tight">Log in</h1>
      </div>

      <p class="mb-8 text-center text-gray-500">Enter your email & password to log in.</p>

      <!-- Form -->
      <form @submit.prevent="submit">
        <fieldset class="grid gap-4">
          <!-- EMAIL -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-600">Email</label>
            <input
              v-model="email"
              type="email"
              id="email"
              autocomplete="email"
              required
              class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring focus:ring-red-600"
              placeholder="sample.rani@valid.com"
            />
          </div>

          <!-- PASSWORD -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-600">Password</label>
            <input
              v-model="password"
              type="password"
              id="password"
              autocomplete="current-password"
              required
              class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring focus:ring-red-600"
              placeholder="******"
            />
          </div>

          <!-- REMEMBER + FORGOT -->
          <div class="flex items-center justify-between mt-2">
            <label class="flex items-center">
              <!-- Remember me affects Firebase Auth persistence -->
              <input
                v-model="rememberMe"
                type="checkbox"
                class="rounded border-gray-300 text-red-600 focus:ring-red-600"
              />
              <span class="ml-2 text-sm text-gray-600">Remember me</span>
            </label>

            <!-- Opens the Forgot Password modal -->
            <button
              type="button"
              class="text-sm font-medium underline text-red-600"
              @click="forgotOpen = true"
            >
              Forgot password?
            </button>
          </div>

          <!-- SUBMIT -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full mt-4 rounded-md bg-red-800 py-2 text-white font-semibold shadow-md transition hover:bg-red-700 disabled:opacity-60 focus:outline-none focus:ring focus:ring-red-600"
          >
            <span v-if="!loading">Log In</span>
            <span v-else>Signing in…</span>
          </button>

          <!-- CANCEL -->
          <button
            type="button"
            @click="cancel"
            class="w-full mt-2 rounded-md bg-gray-300 py-2 text-gray-800 font-semibold shadow-md transition hover:bg-gray-400 focus:outline-none focus:ring focus:ring-gray-600"
          >
            Cancel
          </button>
        </fieldset>
      </form>
    </div>
  </div>

  <ForgotPasswordModal
  v-model="forgotOpen"
  :prefill="email"
  redirect-path="/auth/reset-password"
  @sent="onResetSent"
/>
</template>

<script setup>
/**
 * Nuxt 3 + Firebase Auth + Firestore (JavaScript version)
 * - No TypeScript syntax here (avoids the errors you saw)
 * - No email verification required
 * - Remember me toggles auth persistence (local vs session)
 * - Ensures a user doc exists; routes by role
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'

// Firebase Auth
import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,   // persists after browser restart (Remember ON)
  browserSessionPersistence, // clears on tab close (Remember OFF)
} from 'firebase/auth'

// Firestore
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

definePageMeta({ layout: 'no-navbar-footer' })

// ----------------- STATE -----------------
const email = ref('')
const password = ref('')
const rememberMe = ref(true)
const loading = ref(false)
const forgotOpen = ref(false) // controls the modal

const auth = getAuth()
const db = getFirestore()
const router = useRouter()

// ----------------- ACTIONS -----------------
const submit = async () => {
  if (!email.value.trim() || !password.value.trim()) return

  loading.value = true
  try {
    // Apply persistence based on Remember me
    await setPersistence(
      auth,
      rememberMe.value ? browserLocalPersistence : browserSessionPersistence
    )

    // Sign in (no email verification checks)
    const cred = await signInWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value.trim()
    )
    const user = cred.user

    // Ensure a user document exists
    const userDocRef = doc(db, 'users', user.uid)
    let snap = await getDoc(userDocRef)

    if (!snap.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        role: 'Faculty',     // default role
        departmentId: null,
        status: 'active',    // default status
        createdAt: new Date(),
      })
      snap = await getDoc(userDocRef) // re-fetch newly created data
    }

    const data = snap.data() || {}
    const role = data.role || 'Faculty'
    const status = data.status || 'active'

    // Block inactive accounts except Super Admin
    if (role !== 'Super Admin' && status !== 'active') {
      alert('Your account is inactive. Please contact the administrator.')
      return
    }

    // Route by role
    if (role === 'Super Admin') router.push('/admin/super-admin')
    else if (role === 'Head Admin') router.push('/admin/head-admin')
    else if (role === 'Faculty') router.push('/admin/faculty')
    else {
      console.error('Unknown role:', role)
      alert('User role is not recognized.')
    }
  } catch (err) {
    // No TS cast; log safely for JS
    const msg = err && err.message ? err.message : String(err)
    console.error('Login failed:', msg)
    alert('Invalid email or password.')
  } finally {
    loading.value = false
  }
}

const cancel = () => {
  router.push('/', { replace: true })
}

const onResetSent = (targetEmail) => {
  // Optional: toast/analytics hook
  // console.log('Password reset email attempted for:', targetEmail)
}
</script>
