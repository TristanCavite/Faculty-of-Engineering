<template>
  <div
    class="flex items-center justify-center h-screen bg-center bg-cover"
    style="background-image: url('bg.png')"
  >
    <div class="w-full max-w-md p-6 bg-white border border-gray-300 rounded shadow-md">
      <div class="flex flex-col items-center my-6 space-y-2">
        <img src="/logoTab.png" alt="Logo" class="h-14" />
        <h1 class="text-2xl font-semibold tracking-tight">Log in</h1>
      </div>

      <p class="mb-8 text-center text-gray-500">Enter your email & password to log in.</p>

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
              <input v-model="rememberMe" type="checkbox" class="rounded border-gray-300 text-red-600 focus:ring-red-600" />
              <span class="ml-2 text-sm text-gray-600">Remember me</span>
            </label>

            <button type="button" class="text-sm font-medium underline text-red-600" @click="forgotOpen = true">
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
 * Login (no profile creation)
 * - Reads canonical:   users/<uid>
 * - If a legacy random-id doc exists (where('uid','==', uid) and id !== uid),
 *   it migrates data into users/<uid> and DELETES the legacy doc.
 * - Then routes by normalized role.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'

import {
  getFirestore,
  doc, getDoc, setDoc, deleteDoc,
  collection, query, where, limit, getDocs,
} from 'firebase/firestore'

definePageMeta({ layout: 'no-navbar-footer' })

const email = ref('')
const password = ref('')
const rememberMe = ref(true)
const loading = ref(false)
const forgotOpen = ref(false)

const auth = getAuth()
const db = getFirestore()
const router = useRouter()

/**
 * Load canonical user doc; if a legacy random-id doc exists, migrate then delete it.
 * IMPORTANT: does NOT create a new user profile when missing — admin must create it.
 */
async function loadAndMigrateProfile(uid) {
  // Canonical doc at users/<uid>
  const canonicalRef = doc(db, 'users', uid)
  const canonicalSnap = await getDoc(canonicalRef)
  const canonical = canonicalSnap.exists() ? { id: canonicalSnap.id, ...canonicalSnap.data() } : null

  // Find legacy random-id doc with same uid
  const qs = await getDocs(query(collection(db, 'users'), where('uid', '==', uid), limit(3)))
  const legacyDoc = qs.docs.find(d => d.id !== uid) || null
  const legacy = legacyDoc ? { id: legacyDoc.id, ...legacyDoc.data() } : null

  // If neither exists, do NOT create — this prevents duplicates forever
  if (!canonical && !legacy) return null

  // Choose richer source of truth
  const richness = (x) => (x ? (x.role ? 2 : 0) + (x.status ? 1 : 0) + (x.email ? 1 : 0) : 0)
  const chosen = (richness(legacy) > richness(canonical)) ? legacy : canonical

  // Upsert into canonical
  await setDoc(canonicalRef, {
    ...chosen,
    uid,
    email: chosen?.email || auth.currentUser?.email || '',
    // keep your timestamps on server in admin flows; here it's fine to leave as is
  }, { merge: true })

  // Delete legacy duplicate so lists stop showing it
  if (legacy && legacy.id !== uid) {
    try { await deleteDoc(doc(db, 'users', legacy.id)) }
    catch (e) { console.warn('Legacy user doc delete failed:', e) }
  }

  const final = await getDoc(canonicalRef)
  return { id: final.id, ...final.data() }
}

// Normalize role to snake_case key
const toRoleKey = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '_')

const submit = async () => {
  if (!email.value.trim() || !password.value.trim()) return
  loading.value = true
  try {
    await setPersistence(auth, rememberMe.value ? browserLocalPersistence : browserSessionPersistence)

    const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value.trim())
    const uid = cred.user.uid

    // Load profile and perform one-time migration if a legacy doc exists
    const profile = await loadAndMigrateProfile(uid)

    if (!profile) {
      alert('Your profile has not been set up yet. Please contact a Super Admin.')
      return
    }

    const roleKey = toRoleKey(profile.role)
    const statusKey = toRoleKey(profile.status || 'active')

    if (roleKey !== 'super_admin' && statusKey !== 'active') {
      alert('Your account is inactive. Please contact the administrator.')
      return
    }

    // Route by role (change to '/Admin/...' if your folder is capitalized)
    if (roleKey === 'super_admin') {
      router.push('/admin/super-admin')
    } else if (roleKey === 'head_admin') {
      router.push('/admin/head-admin')
    } else if (roleKey === 'media_admin') {
      router.push('/admin/media-admin')
    } else if (roleKey === 'faculty') {
      router.push('/admin/faculty')
    } else {
      console.error('Unknown role:', profile.role)
      alert('User role is not recognized.')
    }
  } catch (err) {
    console.error('Login failed:', err?.message || err)
    alert('Invalid email or password.')
  } finally {
    loading.value = false
  }
}

const cancel = () => router.push('/', { replace: true })
const onResetSent = () => {}
</script>
