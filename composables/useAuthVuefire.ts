import { doc, getFirestore } from "firebase/firestore";
import { ref, watch } from "vue";
import { useCurrentUser, useDocument } from "vuefire";
import type { Ref } from "vue";

export function useAuthVuefireState() {
  const currentUser = useState<any | null>("auth:currentUser", () => null);
  const userProfile = useState<Record<string, any> | null>("auth:userProfile", () => null);
  const authReady = useState<boolean>("auth:ready", () => false);
  return { currentUser, userProfile, authReady };
}

let _initialized = false;

export async function initAuthVuefire() {
  if (_initialized) return;
  _initialized = true;

  if (!process.client) {
    const { authReady } = useAuthVuefireState();
    authReady.value = true;
    return;
  }

  const { currentUser, userProfile, authReady } = useAuthVuefireState();

  const vfUser = useCurrentUser() as Ref<any | null>;

  watch(
    vfUser,
    async (u) => {
      try {
        currentUser.value = u ?? null;

        if (u && u.uid) {
          const db = getFirestore();
          const userDocRef = doc(db, "users", u.uid);

          const { data: docData } = useDocument(userDocRef);

          watch(
            docData,
            (val) => {
              userProfile.value = val ?? null;
            },
            { immediate: true }
          );
        } else {
          userProfile.value = null;
        }
      } catch (err) {
        console.warn("[initAuthVuefire] error when syncing profile", err);
        userProfile.value = null;
      } finally {
        authReady.value = true;
      }
    },
    { immediate: true }
  );
}

export function waitForAuthVuefire(timeoutMs = 7000): Promise<void> {
  const { authReady } = useAuthVuefireState();
  return new Promise((resolve, reject) => {
    if (authReady.value) return resolve();

    const stop = watch(
      () => authReady.value,
      (v) => {
        if (v) {
          stop();
          resolve();
        }
      }
    );

    if (timeoutMs > 0) {
      setTimeout(() => {
        stop();
        reject(new Error("waitForAuthVuefire timeout"));
      }, timeoutMs);
    }
  });
}
