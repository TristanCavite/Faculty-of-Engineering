// ~/middleware/auth.ts
// Client-only route middleware that waits for VueFire auth to settle before checking.
// Protects routes by role/status and avoids false redirects during SSR/hydration.

import { initAuthVuefire, waitForAuthVuefire, useAuthVuefireState } from '@/composables/useAuthVuefire';

export default defineNuxtRouteMiddleware(async (to) => {
  // 1) Skip server-side: Firebase client auth won't be available on server
  if (!process.client) {
    return;
  }

  // 2) Ensure our listener has been initialized (idempotent)
  await initAuthVuefire();

  // 3) Wait until we've seen initial auth state (user or null)
  try {
    await waitForAuthVuefire(7000); // tune timeout as needed
  } catch (err) {
    // If we timed out, don't aggressively redirect; log and allow navigation
    // This prevents accidental redirects from transient races.
    // eslint-disable-next-line no-console
    console.warn('[auth middleware] waitForAuthVuefire timed out:', err);
    return;
  }

  const { currentUser, userProfile } = useAuthVuefireState();

  // 4) Allow truly public routes (e.g., login, forgot-password). Add your public routes here.
  const publicRoutes = ['/login', '/forgot-password', '/'];
  if (publicRoutes.some((p) => to.path.startsWith(p))) {
    return;
  }

  // 5) If there's no firebase user -> redirect to login
  if (!currentUser.value) {
    // debug
    // eslint-disable-next-line no-console
    console.log('[auth middleware] No firebase user - redirecting to /login');
    return navigateTo('/login');
  }

  // 6) Ensure we have userProfile (should be kept in sync by useDocument watcher)
  const profile = userProfile.value;
  if (!profile) {
    // If the profile isn't available, treat as missing doc: redirect to login
    // (Alternative: try to fetch once more from Firestore; but VueFire's watch should have populated it.)
    // eslint-disable-next-line no-console
    console.warn('[auth middleware] userProfile missing - redirecting to /login');
    return navigateTo('/login');
  }

  const role = profile.role;
  const status = profile.status;

  // 7) Status rules (match your logic): allow Super Admin always
  if (role !== 'Super Admin' && status !== 'active') {
    // eslint-disable-next-line no-console
    console.log('[auth middleware] User is inactive - redirecting to login');
    alert('Your account is inactive. Please contact the administrator.');
    return navigateTo('/login');
  }

  // 8) Role-based route guarding
  if (to.path.startsWith('/super-admin') && role !== 'Super Admin') {
    return navigateTo('/unauthorized');
  }
  if (to.path.startsWith('/head-admin') && role !== 'Head Admin') {
    return navigateTo('/unauthorized');
  }
  if (to.path.startsWith('/faculty') && role !== 'Faculty') {
    return navigateTo('/unauthorized');
  }

  // All good
  // eslint-disable-next-line no-console
  console.log(`[auth middleware] Access granted for ${currentUser.value.uid} role=${role}`);
});
