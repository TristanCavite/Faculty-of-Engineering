// composables/useSocialLinks.ts
import { computed } from 'vue'
import { useFirestore, useDocument } from 'vuefire'
import { doc } from 'firebase/firestore'

// order also defines the valid keys
export const order = ['facebook','instagram','twitter','youtube','linkedin','website'] as const
export type SocialKey = typeof order[number]
export type SocialLinks = Partial<Record<SocialKey, string>>

const isOk = (v?: string) =>
  typeof v === 'string' && v.trim().length > 0 &&
  /^(https?:\/\/|mailto:|tel:)/i.test(v.trim())

export function useSocialLinks() {
  const db = useFirestore()

  // ✅ read the same doc the admin page writes to
  const socialsDoc = useDocument<SocialLinks>(doc(db, 'site', 'socials'))

  const items = computed(() => {
    const data = (socialsDoc.value ?? {}) as SocialLinks
    return order
      .map(key => ({ key, href: (data[key] ?? '').trim() }))
      .filter(x => isOk(x.href))
  })

  return { items, socialsDoc }
}
