// ~/middleware/auth.global.ts
// Nuxt 3 client-only route middleware with VueFire auth sync.
// - Waits for Firebase Auth hydration (avoids false redirects on refresh)
// - Fetches user profile once if reactive state isn't ready yet
// - Normalizes role strings from Firestore
// - Supports route-meta role guards and path-prefix guards
// - Locks down /admin/* (including /admin/super-admin/*)

import {
  initAuthVuefire,
  waitForAuthVuefire,
  useAuthVuefireState,
} from '@/composables/useAuthVuefire'
import { useFirestore } from 'vuefire'
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit as qLimit,
  collection,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

// ---------- Types & Helpers ----------
type Role = 'super_admin' | 'head_admin' | 'faculty'

const ADMIN_BASE = '/admin'
const pathStarts = (p: string, prefix: string) =>
  p === prefix || p.startsWith(prefix + '/')

// Exact PATH public routes only (no startsWith('/'))
const PUBLIC_ROUTES = new Set<string>([
  '/',
  '/login',
  '/forgot-password',
  '/unauthorized',
])

// Accept both spaced and snake_case role labels, any case.
function normalizeRole(input: unknown): Role | 'unknown' {
  if (typeof input !== 'string') return 'unknown'
  const s = input.trim().toLowerCase().replace(/\s+/g, '_')
  if (s === 'super_admin') return 'super_admin'
  if (s === 'head_admin') return 'head_admin'
  if (s === 'faculty') return 'faculty'
  return 'unknown'
}

// Type guard: keep only real Role values (drops 'unknown' at type level)
function isRole(r: unknown): r is Role {
  return r === 'super_admin' || r === 'head_admin' || r === 'faculty'
}

// ACTIVE (case-insensitive). Super Admin bypasses this later.
function isActive(status: unknown): boolean {
  return (
    typeof status === 'string' &&
    status.trim().toLowerCase() === 'active'
  )
}

// Fetch profile once on demand.
// 1) Try doc(users, uid). 2) If missing, query where('uid','==', uid) limit 1.
async function fetchProfileOnce(
  db: Firestore,
  uid: string,
): Promise<DocumentData | null> {
  const byId = await getDoc(doc(db, 'users', uid))
  if (byId.exists()) return { id: byId.id, ...byId.data() }

  const q = query(
    collection(db, 'users'),
    where('uid', '==', uid),
    qLimit(1),
  )
  const qs = await getDocs(q)
  if (!qs.empty) {
    const snap = qs.docs[0]
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export default defineNuxtRouteMiddleware(async (to) => {
  // 1) Client-only
  if (!process.client) return

  // 2) Init & wait for initial auth state
  await initAuthVuefire()
  try {
    await waitForAuthVuefire(10000)
  } catch (err) {
    console.warn('[auth] waitForAuthVuefire timeout:', err)
    return
  }

  const { currentUser, userProfile } = useAuthVuefireState()

  // 3) Public routes (exact match)
  if (PUBLIC_ROUTES.has(to.path)) return

  // 4) Must be signed in
  if (!currentUser.value) {
    console.log('[auth] no Firebase user -> /login')
    return navigateTo('/login', { replace: true })
  }

  // 5) Ensure profile (fetch-once fallback prevents refresh logouts)
  const db = useFirestore()
  let profile: any = userProfile.value
  if (!profile) {
    try {
      profile = await fetchProfileOnce(db, currentUser.value.uid)
      if (!profile) {
        console.warn('[auth] profile missing -> /login')
        return navigateTo('/login', { replace: true })
      }
    } catch (e) {
      console.error('[auth] profile fetch failed:', e)
      return navigateTo('/login', { replace: true })
    }
  }

  // 6) Normalize role & status
  const normalizedRole = normalizeRole(profile.role)
  const active = isActive(profile.status)

  // If role couldn't be normalized, block (prevents TS error and unsafe access)
  if (!isRole(normalizedRole)) {
    console.warn('[auth] unknown role -> /unauthorized')
    return navigateTo('/unauthorized', { replace: true })
  }

  // 7) Status: super_admin bypass; others must be active
  if (normalizedRole !== 'super_admin' && !active) {
    console.log('[auth] inactive account -> /login')
    return navigateTo('/login', { replace: true })
  }

  // 8-A) Route-meta roles (preferred)
  const metaRoles = (to.meta?.roles ?? []) as string[] | undefined
  if (Array.isArray(metaRoles) && metaRoles.length > 0) {
    // Normalize meta roles and drop unknowns with a type predicate
    const allowed: Role[] = metaRoles
      .map(normalizeRole)
      .filter((r): r is Role => isRole(r))

    if (!allowed.includes(normalizedRole)) {
      return navigateTo('/unauthorized', { replace: true })
    }
    // meta passed -> allow
    return
  }

  // 8-B) Path-prefix fallback for pages without meta (locks /admin/**)
  if (pathStarts(to.path, ADMIN_BASE)) {
    // Super Admin area
    const SUPER_ADMIN_PREFIX = `${ADMIN_BASE}/super-admin`
    if (pathStarts(to.path, SUPER_ADMIN_PREFIX)) {
      if (normalizedRole === 'super_admin') return
      return navigateTo('/unauthorized', { replace: true })
    }

    // Head Admin area
    const HEAD_ADMIN_PREFIX = `${ADMIN_BASE}/head-admin`
    if (pathStarts(to.path, HEAD_ADMIN_PREFIX)) {
      if (
        normalizedRole === 'head_admin' ||
        normalizedRole === 'super_admin'
      )
        return
      return navigateTo('/unauthorized', { replace: true })
    }

    // Faculty area
    const FACULTY_PREFIX = `${ADMIN_BASE}/faculty`
    if (pathStarts(to.path, FACULTY_PREFIX)) {
      if (
        normalizedRole === 'faculty' ||
        normalizedRole === 'super_admin'
      )
        return
      return navigateTo('/unauthorized', { replace: true })
    }

    // NOTE: media-admin dedicated area removed
  }

  // 9) Default allow
  console.log(
    `[auth] allow uid=${currentUser.value.uid} role=${normalizedRole}`,
  )
})
