// composables/usePublicFlags.ts
import { computed } from 'vue'
import { useFirestore, useDocument } from 'vuefire'
import { doc } from 'firebase/firestore'

/**
 * Public feature flags (live from Firestore).
 * - admissionUndergradVisible: controls "Undergraduate" visibility
 */
export function usePublicFlags() {
  const db = useFirestore()

  // Single small doc everyone can read
  const flagsRef = doc(db, 'settings', 'public_flags')

  // useDocument() sets up a real-time listener (onSnapshot)
  const { data: flags } = useDocument<{ admissionUndergradVisible?: boolean }>(flagsRef)

  // Default to true (fail-open) if the field isn't set yet
  const undergradVisible = computed(
    () => flags.value?.admissionUndergradVisible ?? true
  )

  return { flags, undergradVisible }
}
