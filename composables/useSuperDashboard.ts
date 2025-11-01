// composables/useSuperDashboard.ts
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import {
  collection,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  type Firestore,
} from 'firebase/firestore'

import {
  User,
  Building2,
  Newspaper,
  CalendarFold,
  Download as DownloadIcon,
  FlaskConical,
} from 'lucide-vue-next'

export function useSuperDashboard() {
  const router = useRouter()
  const db: Firestore = useFirestore()

  // ---------- Routes ----------
  const ROUTE_CANDIDATES = {
    accounts:    ['/admin/super-admin/manage_accounts'],
    departments: ['/admin/super-admin/manage_department', '/admin/super-admin/departments'],
    news:        ['/admin/super-admin/news'],
    events:      ['/admin/super-admin/events'],
    downloads:   ['/admin/super-admin/downloads'],
    research:    ['/admin/super-admin/research'],
    gallery:     ['/admin/super-admin/gallery'],
  } as const

  const routes = reactive<Record<string, string>>({
    accounts: '/', departments: '/', news: '/', events: '/', downloads: '/', research: '/', gallery: '/',
  })

  function resolveFirstExisting(paths: ReadonlyArray<string>) {
    const all = router.getRoutes()
    for (const base of paths) {
      const exists = all.some(r => r.path === base || r.path.startsWith(`${base}/:`))
      if (exists) return base
    }
    return paths[0]
  }
  function resolveAllRoutes() {
    (Object.keys(ROUTE_CANDIDATES) as (keyof typeof ROUTE_CANDIDATES)[])
      .forEach(key => { routes[key] = resolveFirstExisting(ROUTE_CANDIDATES[key]) })
  }
  const linkTo = (base: string, id: string) => `${base.replace(/\/+$/,'')}/${id}`

  // ---------- Stats ----------
  const loading = ref(true)
  const lastUpdated = ref<string | null>(null)
  const stats = ref({ accounts: 0, departments: 0, news: 0, events: 0, downloads: 0 })

  const countAll = async (path: string) => {
    try { return (await getCountFromServer(collection(db, path))).data().count } catch { return 0 }
  }
  const countPublished = async (path: string, field = 'published') => {
    try {
      const qRef = query(collection(db, path), where(field, '==', true))
      return (await getCountFromServer(qRef)).data().count
    } catch { return 0 }
  }

  // ---------- Roles (robust counting) ----------
  const ROLE_VARIANTS: Record<string, string[]> = {
    'Super Admin': ['Super Admin', 'super_admin', 'super admin', 'super-admin'],
    'Head Admin' : ['Head Admin',  'head_admin',  'head admin',  'head-admin'],
    'Faculty'    : ['Faculty', 'faculty'],
    'Media Admin': ['Media Admin', 'media_admin', 'media admin', 'media-admin'],
  }

  async function countByRoleFlexible(roleKey: keyof typeof ROLE_VARIANTS): Promise<number> {
    const variants = ROLE_VARIANTS[roleKey]
      .map(v => v.trim())
      .filter((v, i, a) => v && a.indexOf(v) === i)

    try {
      if (variants.length > 1) {
        const qRef = query(collection(db, 'users'), where('role', 'in', variants))
        return (await getCountFromServer(qRef)).data().count
      } else {
        const qRef = query(collection(db, 'users'), where('role', '==', variants[0]))
        return (await getCountFromServer(qRef)).data().count
      }
    } catch {
      // fallback: sum separate equality queries
      try {
        const parts = await Promise.all(
          variants.map(async v =>
            (await getCountFromServer(query(collection(db, 'users'), where('role', '==', v)))).data().count
          )
        )
        return parts.reduce((a, b) => a + b, 0)
      } catch {
        return 0
      }
    }
  }

  const roles = ref({ superAdmin: 0, headAdmin: 0, faculty: 0, mediaAdmin: 0 })

  // existing bar adapter (kept for your RolesBar list)
  const rolesBar = computed(() => {
    const values = [roles.value.superAdmin, roles.value.headAdmin, roles.value.faculty, roles.value.mediaAdmin]
    const max = Math.max(1, ...values)
    return [
      { label: 'Super Admin', value: roles.value.superAdmin, percent: Math.round((roles.value.superAdmin / max) * 100), color: 'bg-gray-900' },
      { label: 'Head Admin',  value: roles.value.headAdmin,  percent: Math.round((roles.value.headAdmin  / max) * 100), color: 'bg-teal-600' },
      { label: 'Faculty',     value: roles.value.faculty,    percent: Math.round((roles.value.faculty    / max) * 100), color: 'bg-sky-600' },
      { label: 'Media Admin', value: roles.value.mediaAdmin, percent: Math.round((roles.value.mediaAdmin / max) * 100), color: 'bg-violet-600' },
    ]
  })

  // 🔵 NEW: Pie/Donut adapter (labels + values + HEX colors for SVG)
  const rolesDonutRows = computed(() => [
    { label: 'Super Admin', value: roles.value.superAdmin, color: '#111827' }, // gray-900
    { label: 'Head Admin',  value: roles.value.headAdmin,  color: '#0d9488' }, // teal-600
    { label: 'Faculty',     value: roles.value.faculty,    color: '#0284c7' }, // sky-600
    { label: 'Media Admin', value: roles.value.mediaAdmin, color: '#7c3aed' }, // violet-600
  ])

  // ---------- Recent (createdAt only) ----------
  type FeedItem = {
    key: string
    type: 'News' | 'Event' | 'Download'
    title?: string
    preview?: string
    when?: Date
    manageTo: string
    icon: any
    iconColor: string
    bgRing: string
  }
  const recent = ref<FeedItem[]>([])
  const IconByCollection = { news: Newspaper, events: CalendarFold, downloads: DownloadIcon } as const

  async function recentFrom(
    path: 'news' | 'events' | 'downloads',
    typeLabel: 'News'|'Event'|'Download',
    baseListPath: string
  ) {
    const decorate = (d: any, id: string): FeedItem => {
      const title = d.title || d.name || d.fileName || d.heading || d.subject || `Untitled ${typeLabel}`
      const raw = d.summary || d.excerpt || d.description || d.content || ''
      const preview = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, '').slice(0, 120) : ''
      const createdAt: Date =
        d?.createdAt?.toDate ? d.createdAt.toDate() :
        d?.createdAt instanceof Date ? d.createdAt :
        new Date(0)

      const icon = IconByCollection[path]
      const iconColor = path === 'news' ? 'text-amber-600'
                      : path === 'events' ? 'text-fuchsia-600'
                      : 'text-indigo-600'
      const bgRing    = path === 'news' ? 'ring-amber-400/30 bg-amber-50'
                      : path === 'events' ? 'ring-fuchsia-400/30 bg-fuchsia-50'
                      : 'ring-indigo-400/30 bg-indigo-50'

      return { key: `${path}:${id}`, type: typeLabel, title, preview, when: createdAt, manageTo: linkTo(baseListPath, id), icon, iconColor, bgRing }
    }

    try {
      const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(4)))
      return snap.docs.map(doc => decorate(doc.data(), doc.id))
    } catch { return [] }
  }

  // ---------- Quick actions ----------
  const quickActions = computed(() => [
    { to: routes.accounts,    label: 'Accounts',    icon: User,         color: 'text-sky-600',     ring: 'ring-sky-400/30 bg-sky-50' },
    { to: routes.departments, label: 'Departments', icon: Building2,    color: 'text-emerald-600', ring: 'ring-emerald-400/30 bg-emerald-50' },
    { to: routes.news,        label: 'News',        icon: Newspaper,    color: 'text-amber-600',   ring: 'ring-amber-400/30 bg-amber-50' },
    { to: routes.events,      label: 'Events',      icon: CalendarFold, color: 'text-fuchsia-600', ring: 'ring-fuchsia-400/30 bg-fuchsia-50' },
    { to: routes.downloads,   label: 'Downloads',   icon: DownloadIcon, color: 'text-indigo-600',  ring: 'ring-indigo-400/30 bg-indigo-50' },
    { to: routes.research,    label: 'Research',    icon: FlaskConical, color: 'text-rose-600',    ring: 'ring-rose-400/30 bg-rose-50' },
  ])

  // ---------- Fetch all ----------
  async function fetchAll() {
    loading.value = true
    try {
      const [accounts, departments, news, events, downloads] = await Promise.all([
        countAll('users'),
        countAll('departments'),
        countPublished('news', 'published'),
        countAll('events'),
        countAll('downloads'),
      ])
      stats.value = { accounts, departments, news, events, downloads }

      // robust role counts (includes Media Admin)
      const [sa, ha, fa, ma] = await Promise.all([
        countByRoleFlexible('Super Admin'),
        countByRoleFlexible('Head Admin'),
        countByRoleFlexible('Faculty'),
        countByRoleFlexible('Media Admin'),
      ])
      roles.value = { superAdmin: sa, headAdmin: ha, faculty: fa, mediaAdmin: ma }

      const [rNews, rEvents, rDownloads] = await Promise.all([
        recentFrom('news', 'News', routes.news),
        recentFrom('events', 'Event', routes.events),
        recentFrom('downloads', 'Download', routes.downloads),
      ])
      recent.value = [...rNews, ...rEvents, ...rDownloads]
        .sort((a, b) => (a.when && b.when ? b.when.getTime() - a.when.getTime() : 0))
        .slice(0, 8)

      lastUpdated.value = new Date().toLocaleString()
    } finally {
      loading.value = false
    }
  }

  return {
    // routes / state
    routes, resolveAllRoutes, stats, recent, fetchAll, loading, lastUpdated,
    // UI datasets
    quickActions, rolesBar, rolesDonutRows,
  }
}
