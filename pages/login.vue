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

          <div class="flex items-center justify-between mt-2">
            <label class="flex items-center">
              <input v-model="rememberMe" type="checkbox" class="rounded border-gray-300 text-red-600 focus:ring-red-600" />
              <span class="ml-2 text-sm text-gray-600">Remember me</span>
            </label>

            <button type="button" class="text-sm font-medium underline text-red-600" @click="forgotOpen = true">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full mt-4 rounded-md bg-red-800 py-2 text-white font-semibold shadow-md transition hover:bg-red-700 disabled:opacity-60 focus:outline-none focus:ring focus:ring-red-600"
          >
            <span v-if="!loading">Log In</span>
            <span v-else>Signing in…</span>
          </button>

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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAuth, signInWithEmailAndPassword, setPersistence,
  browserLocalPersistence, browserSessionPersistence,
} from 'firebase/auth'
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
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

// Read both places; if random-id doc exists, use it and sync users/<uid> to match
async function loadAndFixProfile(uid) {
  const canonicalRef = doc(db, 'users', uid)
  const canonicalSnap = await getDoc(canonicalRef)
  let canonical = canonicalSnap.exists() ? { id: canonicalSnap.id, ...canonicalSnap.data() } : null

  const qRef = query(collection(db, 'users'), where('uid', '==', uid), limit(1))
  const qs = await getDocs(qRef)
  const random = !qs.empty ? { id: qs.docs[0].id, ...qs.docs[0].data() } : null

  // Choose source of truth: prefer the doc that actually has role/status/email set
  const pick = (a, b) => {
    const score = (x) => (x ? (x.role ? 2 : 0) + (x.status ? 1 : 0) + (x.email ? 1 : 0) : 0)
    return (score(a) >= score(b)) ? a : b
  }
  const chosen = pick(random, canonical) || random || canonical

  // If nothing exists, create canonical fresh
  if (!chosen) {
    await setDoc(canonicalRef, {
      uid, email: auth.currentUser?.email || '',
      role: 'Faculty', departmentId: null, status: 'active',
      createdAt: new Date(), updatedAt: new Date(),
    })
    const snap = await getDoc(canonicalRef)
    return { id: uid, ...snap.data() }
  }

  // Ensure canonical users/<uid> mirrors chosen data (one-time migration)
  if (!canonical || (canonical.role !== chosen.role || canonical.status !== chosen.status)) {
    await setDoc(canonicalRef, {
      ...chosen,
      uid,
      email: chosen.email || auth.currentUser?.email || '',
      updatedAt: new Date(),
    }, { merge: true })
  }

  // Optionally, you can clean up the random doc later in an admin tool.

  // Return the up-to-date canonical doc
  const finalSnap = await getDoc(canonicalRef)
  return { id: finalSnap.id, ...finalSnap.data() }
}

const submit = async () => {
  if (!email.value.trim() || !password.value.trim()) return
  loading.value = true
  try {
    await setPersistence(auth, rememberMe.value ? browserLocalPersistence : browserSessionPersistence)

    const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value.trim())
    const uid = cred.user.uid

    // 👇 Load correct profile and sync users/<uid> so middleware also sees the right role
    const profile = await loadAndFixProfile(uid)
    const roleRaw = (profile.role || '').toString()
    const roleSnake = roleRaw.trim().toLowerCase().replace(/\s+/g, '_') // handles "Media Admin" or "media_admin"
    const status = (profile.status || 'active').toString().toLowerCase()

    if (roleSnake !== 'super_admin' && status !== 'active') {
      alert('Your account is inactive. Please contact the administrator.')
      return
    }

    // Route exactly like other admins
    if (roleSnake === 'super_admin') {
      router.push('/admin/super-admin')
    } else if (roleSnake === 'head_admin') {
      router.push('/admin/head-admin')
    } else if (roleSnake === 'media_admin') {
      // NOTE: if your folder is "Admin", use '/Admin/media-admin'
      router.push('/admin/media-admin')
    } else if (roleSnake === 'faculty') {
      router.push('/admin/faculty')
    } else {
      console.error('Unknown role:', roleRaw)
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
