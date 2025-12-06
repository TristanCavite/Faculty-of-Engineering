// composables/usePublicNavbar.ts
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocument, useFirestore } from 'vuefire'
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore'

export function usePublicNavbar() {
  const router = useRouter()
  const route = useRoute()
  const db = useFirestore()

  /* ------------------ basic state ------------------ */
  const departments = ref<any[]>([])
  const searchQuery = ref('')

  /* ------------------ flags + extra sections ------------------ */
  const flagsRef = doc(db, 'settings', 'public_flags')
  const { data: flags } = useDocument<Record<string, any>>(flagsRef)

  // ABOUT extras
  const extra1Doc = useDocument(doc(db, 'about_sections', 'extra_section_1'))
  const extra2Doc = useDocument(doc(db, 'about_sections', 'extra_section_2'))

  const extra1Label = computed(() => {
    const t = extra1Doc.value?.title as string | undefined
    return t && t.trim().length ? t : 'Extra Section'
  })
  const extra2Label = computed(() => {
    const t = extra2Doc.value?.title as string | undefined
    return t && t.trim().length ? t : 'Extra Section'
  })

  const extra1Visible = computed(() => {
    const secVal = extra1Doc.value?.isVisible as boolean | undefined
    const flagVal = flags.value?.['about_extra_section_1'] as boolean | undefined
    return typeof secVal !== 'undefined'
      ? secVal
      : typeof flagVal !== 'undefined'
        ? flagVal
        : true
  })

  const extra2Visible = computed(() => {
    const secVal = extra2Doc.value?.isVisible as boolean | undefined
    const flagVal = flags.value?.['about_extra_section_2'] as boolean | undefined
    return typeof secVal !== 'undefined'
      ? secVal
      : typeof flagVal !== 'undefined'
        ? flagVal
        : true
  })

  // ADMISSION extras
  const admExtra1Doc = useDocument(doc(db, 'admission_sections', 'extra_section_1'))
  const admExtra2Doc = useDocument(doc(db, 'admission_sections', 'extra_section_2'))

  const admExtra1Label = computed(() => {
    const t = admExtra1Doc.value?.title as string | undefined
    return t && t.trim().length ? t : 'Extra Section'
  })
  const admExtra2Label = computed(() => {
    const t = admExtra2Doc.value?.title as string | undefined
    return t && t.trim().length ? t : 'Extra Section'
  })

  const admExtra1Visible = computed(() => {
    const secVal = admExtra1Doc.value?.isVisible as boolean | undefined
    const flagVal = flags.value?.['admission_extra_section_1'] as boolean | undefined
    return typeof secVal !== 'undefined'
      ? secVal
      : typeof flagVal !== 'undefined'
        ? flagVal
        : true
  })
  const admExtra2Visible = computed(() => {
    const secVal = admExtra2Doc.value?.isVisible as boolean | undefined
    const flagVal = flags.value?.['admission_extra_section_2'] as boolean | undefined
    return typeof secVal !== 'undefined'
      ? secVal
      : typeof flagVal !== 'undefined'
        ? flagVal
        : true
  })

  const admExtra1HasTitle = computed(() => {
    const t = admExtra1Doc.value?.title as string | undefined
    return !!(t && t.trim().length)
  })
  const admExtra2HasTitle = computed(() => {
    const t = admExtra2Doc.value?.title as string | undefined
    return !!(t && t.trim().length)
  })

  const admExtra1ShouldShow = computed(
    () => admExtra1Visible.value && admExtra1HasTitle.value,
  )
  const admExtra2ShouldShow = computed(
    () => admExtra2Visible.value && admExtra2HasTitle.value,
  )

  const undergradVisible = computed(
    () => (flags.value?.admissionUndergradVisible as boolean | undefined) ?? true,
  )

  /* ------------------ tab logic ------------------ */
  const activeTab = computed(() => {
    const path = route.path
    if (path === '/') return 'home'
    if (path.startsWith('/about')) return 'about'
    if (path.startsWith('/academics')) return 'academics'
    if (path.startsWith('/admission')) return 'admission'
    if (path.startsWith('/research')) return 'research'
    if (path.startsWith('/news')) return 'news'
    if (path.startsWith('/download')) return 'download'
    if (path.startsWith('/obe')) return 'obe'
    return 'home'
  })

  const visualTab = ref<string>(activeTab.value)

  watch(
    () => route.path,
    async () => {
      visualTab.value = activeTab.value
      await nextTick()
    },
  )

  const handleTabChange = (value: string) => {
    visualTab.value = value
    switch (value) {
      case 'home':
        router.push('/')
        break
      case 'research':
        router.push('/research/')
        break
      case 'news':
        router.push('/news/')
        break
      case 'download':
        router.push('/download/')
        break
      case 'obe':
        router.push('/obe/')
        break
      // about / academics / admission are dropdown parents, no direct push
      default:
        break
    }
  }

  /* ------------------ search ------------------ */
  function submitSearch() {
    if (searchQuery.value.trim()) {
      router.push({ path: '/search', query: { q: searchQuery.value.trim() } })
    }
  }

  /* ------------------ departments + warm extras ------------------ */
  onMounted(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'departments'))
      departments.value = snapshot.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) || 'Unnamed Dept',
      }))

      // warm a couple of docs to reduce flicker; failures are non-fatal
      try {
        await Promise.all([
          getDoc(doc(db, 'admission_sections', 'extra_section_1')),
          getDoc(doc(db, 'admission_sections', 'extra_section_2')),
          getDoc(flagsRef),
        ])
      } catch {
        // ignore warm errors
      }
    } catch (err) {
      console.error('🔥 Failed to load departments:', err)
    }
  })

  /* ------------------ hide nav on scroll ------------------ */
  const hideNav = ref(false)
  let lastScrollY = 0

  function handleScroll() {
    const currentScrollY = window.scrollY || 0
    if (currentScrollY > lastScrollY && currentScrollY > 80) {
      hideNav.value = true
    } else {
      hideNav.value = false
    }
    lastScrollY = currentScrollY
  }

  onMounted(() => {
    if (process.client) {
      lastScrollY = window.scrollY || 0
      window.addEventListener('scroll', handleScroll)
    }
  })

  onBeforeUnmount(() => {
    if (process.client) {
      window.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    // data
    departments,
    searchQuery,
    hideNav,

    // about extras
    extra1Label,
    extra2Label,
    extra1Visible,
    extra2Visible,

    // admission extras
    admExtra1Label,
    admExtra2Label,
    admExtra1ShouldShow,
    admExtra2ShouldShow,
    undergradVisible,

    // tabs + actions
    visualTab,
    handleTabChange,
    submitSearch,
  }
}
