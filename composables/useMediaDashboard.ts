import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import {
  collection, getCountFromServer, query, where, orderBy, limit, getDocs, type Firestore,
} from 'firebase/firestore'
import { Newspaper, CalendarFold, FlaskConical } from 'lucide-vue-next'

export function useMediaDashboard() {
  const router = useRouter()
  const db: Firestore = useFirestore()

  // ----- routes -----
  const ROUTE_CANDIDATES = {
    about:     ['/admin/media-admin/about'],
    admission: ['/admin/media-admin/admission'],
    news:      ['/admin/media-admin/news'],
    events:    ['/admin/media-admin/events'],
    research:  ['/admin/media-admin/research'],
  } as const

  const routes = reactive<Record<string, string>>({
    about: '/', admission: '/', news: '/', events: '/', research: '/',
  })

  // Accept readonly arrays to work with `as const` tuples
  function resolveFirstExisting(paths: ReadonlyArray<string>) {
    const all = router.getRoutes()
    for (const base of paths) {
      const exists = all.some(r => r.path === base || r.path.startsWith(`${base}/:`))
      if (exists) return base
    }
    return paths[0]
  }
  function resolveAllRoutes() {
    ;(Object.keys(ROUTE_CANDIDATES) as (keyof typeof ROUTE_CANDIDATES)[])
      .forEach(key => { routes[key] = resolveFirstExisting(ROUTE_CANDIDATES[key]) })
  }
  const linkTo = (base: string, id: string) => `${base.replace(/\/+$/,'')}/${id}`

  // ----- counts -----
  const loading = ref(true)
  const lastUpdated = ref<string | null>(null)
  const stats = ref({ about: 0, admission: 0, news: 0, events: 0, research: 0 })

  const countAll = async (path: string) => {
    try { return (await getCountFromServer(collection(db, path))).data().count } catch { return 0 }
  }
  const countPublished = async (path: string, field = 'published') => {
    try { return (await getCountFromServer(query(collection(db, path), where(field, '==', true)))).data().count } catch { return 0 }
  }

  // ----- recent -----
  type Feed = Array<{
    key: string; type: 'News'|'Event'|'Research'; title?: string; preview?: string;
    when?: any; manageTo: string; icon: any; iconColor: string; bgRing: string;
  }>
  const recent = ref<Feed>([])

  const IconByCollection = { news: Newspaper, events: CalendarFold, researches: FlaskConical } as const

  async function recentFrom(
    path: 'news'|'events'|'researches',
    tryFields: string[], typeLabel: 'News'|'Event'|'Research', baseListPath: string,
  ) {
    const decorate = (d: any, id: string) => {
      const title = d.title || d.name || d.heading || d.subject || `Untitled ${typeLabel}`
      const raw = d.summary || d.excerpt || d.description || d.content || ''
      const preview = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, '').slice(0, 120) : ''
      const when = d.publishedAt || d.createdAt || d.updatedAt || d.date || d.time || null
      const icon = IconByCollection[path]
      const iconColor = path === 'news' ? 'text-amber-600' : path === 'events' ? 'text-fuchsia-600' : 'text-rose-600'
      const bgRing    = path === 'news' ? 'ring-amber-400/30 bg-amber-50'
                        : path === 'events' ? 'ring-fuchsia-400/30 bg-fuchsia-50'
                        : 'ring-rose-400/30 bg-rose-50'
      return { key: `${path}:${id}`, type: typeLabel, title, preview, when: (when?.toDate ? when.toDate() : when), manageTo: linkTo(baseListPath, id), icon, iconColor, bgRing }
    }

    for (const f of tryFields) {
      try {
        const snap = await getDocs(query(collection(db, path), orderBy(f, 'desc'), limit(4)))
        if (!snap.empty) return snap.docs.map(doc => decorate(doc.data(), doc.id))
      } catch {}
    }
    try {
      const snap = await getDocs(query(collection(db, path), limit(4)))
      return snap.docs.map(doc => decorate(doc.data(), doc.id))
    } catch { return [] }
  }

  async function fetchAll() {
    loading.value = true
    try {
      const [about, admission, news, events, research] = await Promise.all([
        countAll('about_sections'),
        countAll('admission_sections'),
        countPublished('news', 'published'),
        countAll('events'),
        countAll('researches'),
      ])
      stats.value = { about, admission, news, events, research }

      const [rNews, rEvents, rResearch] = await Promise.all([
        recentFrom('news',       ['publishedAt','createdAt','updatedAt','date'], 'News',     routes.news),
        recentFrom('events',     ['createdAt','date','startDate'],               'Event',    routes.events),
        recentFrom('researches', ['createdAt','updatedAt','date'],               'Research', routes.research),
      ])
      recent.value = [...rNews, ...rEvents, ...rResearch]
        .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
        .slice(0, 10)

      lastUpdated.value = new Date().toLocaleString()
    } finally {
      loading.value = false
    }
  }

  return { routes, resolveAllRoutes, stats, recent, fetchAll, loading, lastUpdated }
}
