<template>
  <!-- Simple fade transition for the modal -->
  <transition name="fade">
    <!-- Backdrop -->
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      @click.self="close"
    >
      <!-- Modal panel -->
      <div
        class="w-full max-w-md mx-4 rounded-2xl bg-red-900/80 px-6 py-6 shadow-xl ring-1 ring-white/15 backdrop-blur-xl"
      >
        <!-- Header -->
        <header class="mb-4">
          <h2 class="text-xl font-semibold text-white">Reset password</h2>
          <p class="mt-1 text-sm text-white/80">
            Enter the email address associated with your account. If we find a matching account,
            we’ll send you a password reset link.
          </p>
        </header>

        <!-- Status messages -->
        <div
          v-if="errorMessage"
          class="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-100"
        >
          {{ errorMessage }}
        </div>
        <div
          v-if="successMessage"
          class="mb-3 rounded-md bg-emerald-600/10 px-3 py-2 text-sm text-emerald-100"
        >
          {{ successMessage }}
        </div>

        <!-- Form -->
        <form @submit.prevent="submit" class="space-y-4">
          <!-- EMAIL -->
          <div>
            <label for="reset-email" class="block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="reset-email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="mt-1 w-full rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder-white/50 shadow-sm transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/40"
              placeholder="you@example.com"
            />
            <p class="mt-1 text-xs text-white/70">
              We’ll send a reset link if this email is registered.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              :disabled="loading"
              @click="close"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black shadow-md transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading"
            >
              <span v-if="!loading">Send reset link</span>
              <span v-else>Sending…</span>
            </button>
          </div>

          <p class="pt-1 text-[11px] text-white/60">
            The reset link is time-limited. For security, it typically expires after a short period
          </p>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
/**
 * ForgotPasswordModal.vue
 *
 * Props:
 *  - v-model (modelValue): controls open/close
 *  - prefill: prefilled email from login form
 *  - redirectPath: where Firebase will redirect after user clicks reset link
 *
 * Emits:
 *  - update:modelValue(boolean)
 *  - sent(email: string)  // emitted after a successful send
 */

import { ref, watch } from 'vue'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

// Props definition
const props = defineProps<{
  modelValue: boolean
  prefill?: string
  redirectPath?: string
}>()

// Emits definition
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'sent', email: string): void
}>()

// Local state
const email = ref<string>('')           // email input
const loading = ref<boolean>(false)     // send button loading state
const errorMessage = ref<string>('')    // error text to show if something fails
const successMessage = ref<string>('')  // success text when email is sent

// Whenever the modal opens, prefill the email and clear messages
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      email.value = (props.prefill || '').trim()
      errorMessage.value = ''
      successMessage.value = ''
    }
  },
  { immediate: true },
)

/**
 * Close the modal (respect the v-model contract)
 */
const close = () => {
  if (loading.value) return // don't allow closing while sending
  emit('update:modelValue', false)
}

/**
 * Submit handler
 * - Validates email
 * - Calls Firebase Auth's sendPasswordResetEmail
 * - Shows specific error if user is not found
 */
const submit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  const trimmedEmail = email.value.trim()

  if (!trimmedEmail) {
    errorMessage.value = 'Please enter your email address.'
    return
  }

  loading.value = true
  try {
    const auth = getAuth()

    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : ''

    const redirectPath = props.redirectPath || '/auth/reset-password'

    await sendPasswordResetEmail(auth, trimmedEmail, {
      url: `${baseUrl}${redirectPath}`,
      handleCodeInApp: true,
    })

    // If no error is thrown, the email exists in Auth and reset link was sent.
    successMessage.value =
      'Password reset link sent. Please check your email inbox (and spam folder).'
    emit('sent', trimmedEmail)
  } catch (err: any) {
    console.error('Password reset failed:', err)

    const code = err?.code || ''

    if (code === 'auth/user-not-found') {
      errorMessage.value = 'No account found with that email address.'
    } else if (code === 'auth/invalid-email') {
      errorMessage.value = 'The email address is invalid. Please double check it.'
    } else if (code === 'auth/too-many-requests') {
      errorMessage.value =
        'Too many reset attempts. Please wait a few minutes before trying again.'
    } else {
      errorMessage.value =
        'Something went wrong while sending the reset link. Please try again in a moment.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Simple fade transition for the backdrop + modal */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
