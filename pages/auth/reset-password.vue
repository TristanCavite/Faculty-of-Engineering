<!-- pages/auth/reset-password.vue -->
<template>
  <div class="relative flex items-center justify-center min-h-screen overflow-hidden">
    <!-- Blurred photo background -->
    <div
      class="absolute inset-0 scale-105 bg-center bg-cover -z-20 blur-xl"
      style="background-image: url('/bg.png')"
      aria-hidden="true"
    />
    <!-- Dark overlay -->
    <div class="absolute inset-0 -z-10 bg-black/70" aria-hidden="true" />

    <!-- Glassy card -->
    <div class="relative mx-4 w-full max-w-[480px] sm:max-w-[520px]">
      <div
        class="rounded-2xl bg-red-900/70 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]"
      >
        <!-- Header -->
        <div class="flex flex-col items-center px-8 pt-8">
          <img src="/FE_logo_white_wbg.png" alt="Logo" class="h-14" />
          <h1 class="mt-3 text-2xl font-semibold tracking-tight text-white">
            Reset Password
          </h1>
          <p class="mt-1 mb-6 text-sm text-center text-white/70">
            Set a new password for your account.
          </p>
        </div>

        <!-- CONTENT AREA -->
        <div class="px-8 pb-8">
          <!-- STATUS: verifying -->
          <div v-if="status === 'verifying'" class="text-sm text-white/80">
            Verifying your reset link…
          </div>

          <!-- STATUS: error -->
          <div v-else-if="status === 'error'" class="space-y-4">
            <div
              class="rounded-md bg-red-600/90 px-4 py-3 text-sm text-red-50 border border-red-300"
            >
              {{ errorMessage || 'This password reset link is invalid or has expired.' }}
            </div>

            <button
              type="button"
              class="w-full rounded-lg bg-white/10 py-2.5 font-semibold text-white shadow-sm transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
              @click="goToLogin"
            >
              Back to login
            </button>
          </div>

          <!-- STATUS: completed -->
          <div v-else-if="status === 'completed'" class="space-y-4">
            <div
              class="rounded-md bg-emerald-600/90 px-4 py-3 text-sm text-emerald-50 border border-emerald-300"
            >
              {{ successMessage || 'Your password has been updated. You can now log in.' }}
            </div>

            <button
              type="button"
              class="w-full rounded-lg bg-white py-2.5 font-semibold text-black shadow-lg transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/30"
              @click="goToLogin"
            >
              Go to login
            </button>
          </div>

          <!-- STATUS: ready (show form) -->
          <form v-else @submit.prevent="submit" class="space-y-4">
            <!-- Notices -->
            <div
              v-if="errorMessage"
              class="rounded-md bg-red-600/90 px-3 py-2 text-sm text-red-50 border border-red-300"
            >
              {{ errorMessage }}
            </div>
            <div
              v-if="successMessage"
              class="rounded-md bg-emerald-600/90 px-3 py-2 text-sm text-emerald-50 border border-emerald-300"
            >
              {{ successMessage }}
            </div>

            <!-- New password -->
            <div>
              <label for="new-password" class="block text-sm font-medium text-white/80">
                New password
              </label>
              <input
                id="new-password"
                v-model="password"
                type="password"
                autocomplete="new-password"
                required
                class="mt-1 w-full rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder-white/50 shadow-sm transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Enter new password"
              />
            </div>

            <!-- Confirm password -->
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-white/80">
                Confirm password
              </label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                class="mt-1 w-full rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder-white/50 shadow-sm transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Re-enter new password"
              />
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="loading"
              class="mt-2 w-full rounded-lg bg-white py-2.5 font-semibold text-black shadow-lg transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span v-if="!loading">Update password</span>
              <span v-else>Updating…</span>
            </button>

            <!-- Back -->
            <button
              type="button"
              class="w-full rounded-lg bg-white/10 py-2.5 font-semibold text-white shadow-sm transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
              @click="goToLogin"
              :disabled="loading"
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAuth,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth'

definePageMeta({ layout: 'no-navbar-footer' })

const route = useRoute()
const router = useRouter()
const auth = getAuth()

// ui state
const status = ref<'verifying' | 'ready' | 'completed' | 'error'>('verifying')
const loading = ref(false)
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const oobCode = ref<string | null>(null)
const accountEmail = ref<string | null>(null)

// go to login (adjust path if your login is different)
const goToLogin = () => {
  router.push('/auth/login') // change to '/auth' or '/' if needed
}

onMounted(async () => {
  // Read oobCode from query string
  const code = (route.query.oobCode as string | undefined) || null

  if (!code) {
    status.value = 'error'
    errorMessage.value = 'Invalid password reset link.'
    return
  }

  oobCode.value = code

  try {
    // Verify that the code is valid and get the email
    const email = await verifyPasswordResetCode(auth, code)
    accountEmail.value = email
    status.value = 'ready'
  } catch (err: any) {
    console.error('verifyPasswordResetCode failed:', err)
    status.value = 'error'

    const code = err?.code || ''
    if (code === 'auth/expired-action-code') {
      errorMessage.value = 'This password reset link has expired. Please request a new one.'
    } else if (code === 'auth/invalid-action-code') {
      errorMessage.value = 'This password reset link is invalid or has already been used.'
    } else {
      errorMessage.value = 'Unable to verify this reset link. Please request a new one.'
    }
  }
})

const submit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!oobCode.value) {
    errorMessage.value = 'Invalid or missing reset code.'
    return
  }

  if (!password.value || !confirmPassword.value) {
    errorMessage.value = 'Please enter and confirm your new password.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  if (password.value.length < 6) {
    // basic password rule (match Firebase default)
    errorMessage.value = 'Password should be at least 6 characters long.'
    return
  }

  loading.value = true
  try {
    await confirmPasswordReset(auth, oobCode.value, password.value)

    status.value = 'completed'
    successMessage.value = 'Your password has been updated. You can now log in.'
  } catch (err: any) {
    console.error('confirmPasswordReset failed:', err)
    const code = err?.code || ''

    if (code === 'auth/expired-action-code') {
      status.value = 'error'
      errorMessage.value = 'This password reset link has expired. Please request a new one.'
    } else if (code === 'auth/invalid-action-code') {
      status.value = 'error'
      errorMessage.value = 'This password reset link is invalid or has already been used.'
    } else {
      errorMessage.value = 'Failed to update your password. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>
