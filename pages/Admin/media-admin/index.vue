<template>
  <!-- Main Content -->
  <main class="p-6">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Media Dashboard</h1>
        <p class="text-sm text-gray-600">Media Admin</p>
      </div>

      <button
        @click="fetchAll()"
        :disabled="loading"
        class="rounded-lg bg-maroon px-4 py-2 font-semibold text-white shadow hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-60"
        title="Refresh counts"
      >
        <span v-if="!loading">Refresh</span>
        <span v-else>Updating…</span>
      </button>
    </header>

    <!-- Stat Cards (Media Admin scope only) -->
    <section>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <!-- About sections -->
        <article class="stat-card group">
          <div class="stat-icon bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 ring-cyan-400/30">
            <Info class="h-6 w-6 text-cyan-600" />
          </div>
          <h3 class="stat-label">About</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.about.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">About sections</p>
        </article>

        <!-- Admission sections -->
        <article class="stat-card group">
          <div class="stat-icon bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 ring-emerald-400/30">
            <BookOpen class="h-6 w-6 text-emerald-600" />
          </div>
          <h3 class="stat-label">Admission</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.admission.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">Admission sections</p>
        </article>

        <!-- News (Published) -->
        <article class="stat-card group">
          <div class="stat-icon bg-gradient-to-br from-amber-500/20 to-amber-400/10 ring-amber-400/30">
            <Newspaper class="h-6 w-6 text-amber-600" />
          </div>
          <h3 class="stat-label">News (Published)</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.news.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">Live articles</p>
        </article>

        <!-- Events -->
        <article class="stat-card group">
          <div class="stat-icon bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-400/10 ring-fuchsia-400/30">
            <CalendarFold class="h-6 w-6 text-fuchsia-600" />
          </div>
          <h3 class="stat-label">Events</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.events.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">Total events</p>
        </article>

        <!-- Research -->
        <article class="stat-card group">
          <div class="stat-icon bg-gradient-to-br from-rose-500/20 to-rose-400/10 ring-rose-400/30">
            <FlaskConical class="h-6 w-6 text-rose-600" />
          </div>
          <h3 class="stat-label">Research</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.research.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">Research entries</p>
        </article>
      </div>
    </section>

    <!-- Quick Actions (Media Admin scope only) -->
    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold text-gray-600">Quick actions</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <NuxtLink v-for="a in quickActions" :key="a.to" :to="a.to" class="qa-card">
          <div class="qa-icon" :class="a.ring">
            <component :is="a.icon" class="h-5 w-5" :class="a.color" />
          </div>
          <span class="text-sm font-medium text-gray-800">{{ a.label }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="mt-8">
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800">Recent updates</h2>
          <NuxtLink :to="routes.news" class="text-sm font-medium text-maroon hover:underline">View all news</NuxtLink>
        </div>

        <ul class="divide-y divide-gray-100">
          <li v-for="item in recent" :key="item.key" class="py-3 flex items-start gap-3">
            <div class="rounded-lg p-2 ring-1" :class="item.bgRing">
              <component :is="item.icon" class="h-5 w-5" :class="item.iconColor" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900">
                {{ item.title || 'Untitled' }}
                <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{{ item.type }}</span>
              </p>
              <p class="mt-0.5 line-clamp-1 text-xs text-gray-500" v-if="item.preview" v-html="item.preview"></p>
              <p class="mt-0.5 text-xs text-gray-400">{{ formatTime(item.when) }}</p>
            </div>
            <NuxtLink :to="item.manageTo" class="text-xs font-medium text-maroon hover:underline">Open</NuxtLink>
          </li>

          <li v-if="!recent.length && !loading" class="py-6 text-center text-sm text-gray-500">
            No recent items yet.
          </li>
        </ul>
      </div>
    </section>

    <p class="mt-6 text-xs text-gray-500">
      Last updated: <span>{{ lastUpdated || '—' }}</span>
    </p>
  </main>
</template>

<script setup lang="ts">
/**
 * Media Admin Dashboard — limited to About, Admission, News, Events, Research.
 * Uses VueFire + Firestore counts and recent feed.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import {
  collection, getCountFromServer, query, where, getDocs, orderBy, limit, type Firestore,
} from 'firebase/firestore'

// Icons (lucide-vue-next)
import {
  Info,
  BookOpen,
  Newspaper,
  CalendarFold,
  FlaskConical,
} from 'lucide-vue-next'

// Restrict this page to Media Admin (and Super Admin fallback).
definePageMeta({
  middleware: ['auth'],
  roles: ['media_admin', 'super_admin'],
  layout: 'media-admin'
})

// ---------- Router-aware dynamic routes (only what Media Admin may manage) ----------
const router = useRouter()

const ROUTE_CANDIDATES = {
  about:     ['/admin/super-admin/about'],
  admission: ['/admin/super-admin/admission'],
  news:      ['/admin/super-admin/news'],
  events:    ['/admin/super-admin/events'],
  research:  ['/admin/super-admin/research'],
}

const routes = reactive<Record<string, string>>({
  about: '/', admission: '/', news: '/', events: '/', research: '/',
})

function resolveFirstExisting(paths: string[]) {
  const all = router.getRoutes()
  for (const base of paths) {
    const exists = all.some(r =>
      r.path === base || r.path.startsWith(`${base}/:`)
    )
    if (exists) return base
  }
  return paths[0]
}

function resolveAllRoutes() {
  (Object.keys(ROUTE_CANDIDATES) as (keyof typeof ROUTE_CANDIDATES)[])
    .forEach(key => { routes[key] = resolveFirstExisting(ROUTE_CANDIDATES[key]) })
}
const docLink = (base: string, id: string) => `${base.replace(/\/+$/,'')}/${id}`

// ---------- Firestore ----------
const db: Firestore = useFirestore()

const loading = ref(true)
const lastUpdated = ref<string | null>(null)

// Only Media Admin–relevant stats
const stats = ref({
  about: 0,
  admission: 0,
  news: 0,
  events: 0,
  research: 0,
})

async function countAll(path: string): Promise<number> {
  try {
    return (await getCountFromServer(collection(db, path))).data().count
  } catch {
    return 0
  }
}

async function countPublished(path: string, field = 'published'): Promise<number> {
  try {
    const qRef = query(collection(db, path), where(field, '==', true))
    return (await getCountFromServer(qRef)).data().count
  } catch {
    return 0
  }
}

// --- Recent feed (News, Events, Research) ---
type FeedItem = {
  key: string
  type: 'News' | 'Event' | 'Research'
  title?: string
  preview?: string
  when?: Date | string | number
  manageTo: string
  icon: any
  iconColor: string
  bgRing: string
}

const recent = ref<FeedItem[]>([])

const IconByCollection = {
  news: Newspaper,
  events: CalendarFold,
  researches: FlaskConical,
} as const

async function recentFrom(
  path: 'news' | 'events' | 'researches',
  tryFields: string[],
  typeLabel: FeedItem['type'],
  baseListPath: string,
) {
  const decorate = (d: any, id: string) => {
    const title = d.title || d.name || d.heading || d.subject || `Untitled ${typeLabel}`
    const raw = d.summary || d.excerpt || d.description || d.content || ''
    const preview = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, '').slice(0, 120) : ''
    const when = d.publishedAt || d.createdAt || d.updatedAt || d.date || d.time || null

    const icon = IconByCollection[path]
    const iconColor = path === 'news' ? 'text-amber-600'
                    : path === 'events' ? 'text-fuchsia-600'
                    : 'text-rose-600'
    const bgRing    = path === 'news' ? 'ring-amber-400/30 bg-amber-50'
                    : path === 'events' ? 'ring-fuchsia-400/30 bg-fuchsia-50'
                    : 'ring-rose-400/30 bg-rose-50'

    return {
      key: `${path}:${id}`,
      type: typeLabel,
      title,
      preview,
      when: (when?.toDate ? when.toDate() : when) as any,
      manageTo: docLink(baseListPath, id),
      icon, iconColor, bgRing,
    }
  }

  for (const f of tryFields) {
    try {
      const qRef = query(collection(db, path), orderBy(f, 'desc'), limit(4))
      const snap = await getDocs(qRef)
      if (!snap.empty) return snap.docs.map(doc => decorate(doc.data(), doc.id))
    } catch {}
  }
  try {
    const snap = await getDocs(query(collection(db, path), limit(4)))
    return snap.docs.map(doc => decorate(doc.data(), doc.id))
  } catch { return [] }
}

function formatTime(v: any) {
  const d = v instanceof Date ? v : new Date(v || Date.now())
  return d.toLocaleString()
}

// Quick actions — only allowed areas
const quickActions = computed(() => [
  { to: routes.about,     label: 'About',     icon: Info,         color: 'text-cyan-600',    ring: 'ring-cyan-400/30 bg-cyan-50' },
  { to: routes.admission, label: 'Admission', icon: BookOpen,     color: 'text-emerald-600', ring: 'ring-emerald-400/30 bg-emerald-50' },
  { to: routes.news,      label: 'News',      icon: Newspaper,    color: 'text-amber-600',   ring: 'ring-amber-400/30 bg-amber-50' },
  { to: routes.events,    label: 'Events',    icon: CalendarFold, color: 'text-fuchsia-600', ring: 'ring-fuchsia-400/30 bg-fuchsia-50' },
  { to: routes.research,  label: 'Research',  icon: FlaskConical, color: 'text-rose-600',    ring: 'ring-rose-400/30 bg-rose-50' },
])

// Fetch everything for Media Admin
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
      recentFrom('news',       ['publishedAt', 'createdAt', 'updatedAt', 'date'], 'News',     routes.news),
      recentFrom('events',     ['createdAt', 'date', 'startDate'],                 'Event',    routes.events),
      recentFrom('researches', ['createdAt', 'updatedAt', 'date'],                 'Research', routes.research),
    ])
    recent.value = [...rNews, ...rEvents, ...rResearch]
      .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
      .slice(0, 10)

    lastUpdated.value = new Date().toLocaleString()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  resolveAllRoutes()
  await fetchAll()
})
</script>

<style scoped>
/* Stat cards */
.stat-card { @apply relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition; }
.stat-card::after { content:""; @apply pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-[24px];
  background: radial-gradient(120px 120px at 100% 0%, rgba(0,0,0,0.04), transparent 60%); }
.stat-card:hover { @apply shadow-md; }
.stat-icon { @apply mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1; }
.stat-label { @apply text-sm font-medium text-gray-600; }
.stat-number { @apply mt-1 text-3xl font-extrabold tracking-tight text-gray-900; }
.stat-sub { @apply mt-1 text-xs text-gray-500; }

/* Quick actions */
.qa-card { @apply flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md; }
.qa-icon { @apply inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1; }

/* Project color (maroon) helper */
.bg-maroon { background-color: #7b1d20; }
.text-maroon { color: #7b1d20; }
</style>
