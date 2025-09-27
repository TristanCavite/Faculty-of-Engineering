// ~/plugins/vuefire-init.client.ts
// Runs only in browser. Sets auth persistence and starts VueFire-based auth initialization.

import { defineNuxtPlugin } from '#app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initAuthVuefire } from '@/composables/useAuthVuefire';

export default defineNuxtPlugin(async () => {
  // Only attempt persistence in client
  try {
    const auth = getAuth();
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    // if firebase isn't initialized yet, ignore; we will still init the listener later
    // eslint-disable-next-line no-console
    console.warn('[vuefire-init] setPersistence failed or firebase not ready:', e);
  }

  // Kick off our init (idempotent)
  try {
    // not strictly required to await but doing so helps ensure
    // initialization begins before middleware runs.
    await initAuthVuefire();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[vuefire-init] initAuthVuefire error:', err);
  }
});
