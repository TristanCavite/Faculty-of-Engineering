<template>
    <!-- Page background layers -->
  <div class="relative flex items-center justify-center min-h-screen overflow-hidden">
    <!-- Blurred photo -->
    <div
      class="absolute inset-0 scale-105 bg-center bg-cover -z-20 blur-xl"
      style="background-image: url('/bg.png')"
      aria-hidden="true"
    />
    <!-- Dark overlay to improve contrast -->
    <div class="absolute inset-0 -z-10 bg-black/70" aria-hidden="true" />

    <!-- Glassy form box -->
   <div class="relative mx-4 w-full max-w-[480px] sm:max-w-[520px]">

      <div
        class="rounded-2xl bg-red-900/70 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]"
      >
        <!-- Header -->
        <div class="flex flex-col items-center px-8 pt-8">
          <img src="/FE_logo_white_wbg.png" alt="Logo" class="h-14" />
          <h1 class="mt-3 text-2xl font-semibold tracking-tight text-white">LOGIN</h1>
          <p class="mt-1 mb-6 text-sm text-center text-white/70">
            Enter your email & password to log in.
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="submit" class="px-8 pb-8">
          <fieldset class="grid gap-4">
            <!-- EMAIL -->
            <div>
              <label for="email" class="block text-sm font-medium text-white/80">Email</label>
              <input
                v-model="email"
                type="email"
                id="email"
                autocomplete="email"
                required
                class="w-full px-3 py-2 mt-1 text-white transition border rounded-lg shadow-sm outline-none border-white/20 bg-white/5 placeholder-white/40 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                placeholder="sample.rani@valid.com"
              />
            </div>

            <!-- PASSWORD -->
            <div>
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-medium text-white/80">Password</label>
                <button
                  type="button"
                  class="text-sm font-medium underline text-white/90 decoration-white/30 underline-offset-4 hover:decoration-white"
                  @click="forgotOpen = true"
                >
                  Forgot password?
                </button>
              </div>
              <input
                v-model="password"
                type="password"
                id="password"
                autocomplete="current-password"
                required
                class="w-full px-3 py-2 mt-1 text-white transition border rounded-lg shadow-sm outline-none border-white/20 bg-white/5 placeholder-white/40 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                placeholder="******"
              />
            </div>

            <!-- REMEMBER -->
            <label class="inline-flex items-center gap-2 mt-1">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="text-red-600 bg-transparent rounded border-white/30 focus:ring-red-600"
              />
              <span class="text-sm text-white/80">Remember me</span>
            </label>

            <!-- SUBMIT -->
            <button
              type="submit"
              :disabled="loading"
              class="mt-2 w-full rounded-lg bg-white py-2.5 font-semibold text-black shadow-lg transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span v-if="!loading">Log In</span>
              <span v-else>Signing in…</span>
            </button>

            <!-- CANCEL -->
            <button
              type="button"
              @click="cancel"
              class="w-full rounded-lg bg-white/10 py-2.5 font-semibold text-white shadow-sm transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Cancel
            </button>
          </fieldset>
        </form>
      </div>
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

async function loadAndMigrateProfile(uid) {
  const canonicalRef = doc(db, 'users', uid)
  const canonicalSnap = await getDoc(canonicalRef)
  const canonical = canonicalSnap.exists() ? { id: canonicalSnap.id, ...canonicalSnap.data() } : null

  const qs = await getDocs(query(collection(db, 'users'), where('uid', '==', uid), limit(3)))
  const legacyDoc = qs.docs.find(d => d.id !== uid) || null
  const legacy = legacyDoc ? { id: legacyDoc.id, ...legacyDoc.data() } : null

  if (!canonical && !legacy) return null

  const richness = (x) => (x ? (x.role ? 2 : 0) + (x.status ? 1 : 0) + (x.email ? 1 : 0) : 0)
  const chosen = (richness(legacy) > richness(canonical)) ? legacy : canonical

  await setDoc(canonicalRef, {
    ...chosen,
    uid,
    email: chosen?.email || auth.currentUser?.email || '',
  }, { merge: true })

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

    if (roleKey === 'super_admin') {
      router.push('/admin/super-admin')
    } else if (roleKey === 'head_admin') {
      router.push('/admin/head-admin')
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
