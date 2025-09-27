<template>
  <!-- Main Content -->
  <main class="p-6">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Admin Dashboard</h1>
        <p class="text-sm text-gray-600">Super Admin</p>
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

    <!-- Stat Cards -->
    <section>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <!-- Accounts -->
        <article class="stat-card group">
          <div class="stat-icon bg-gradient-to-br from-sky-500/20 to-sky-400/10 ring-sky-400/30">
  <User class="h-6 w-6 text-sky-600" />
</div>
          <h3 class="stat-label">Accounts</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.accounts.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">All user roles</p>
        </article>

        <!-- Departments -->
        <article class="stat-card group">
         <div class="stat-icon bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 ring-emerald-400/30">
  <Building2 class="h-6 w-6 text-emerald-600" />
</div>
          <h3 class="stat-label">Departments</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.departments.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">Active departments</p>
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

        <!-- Downloads -->
        <article class="stat-card group">
         <div class="stat-icon bg-gradient-to-br from-indigo-500/20 to-indigo-400/10 ring-indigo-400/30">
  <DownloadIcon class="h-6 w-6 text-indigo-600" />
</div>
          <h3 class="stat-label">Downloads</h3>
          <p class="stat-number" :class="loading && 'animate-pulse'">
            <span v-if="!loading">{{ stats.downloads.toLocaleString() }}</span><span v-else>—</span>
          </p>
          <p class="stat-sub">Files available</p>
        </article>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold text-gray-600">Quick actions</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <NuxtLink v-for="a in quickActions" :key="a.to" :to="a.to" class="qa-card">
          <div class="qa-icon" :class="a.ring">
            <component :is="a.icon" class="h-5 w-5" :class="a.color" />
          </div>
          <span class="text-sm font-medium text-gray-800">{{ a.label }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Recent + Roles -->
    <section class="mt-8 grid gap-6 xl:grid-cols-3">
      <!-- Recent Updates feed -->
      <div class="col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800">Recent updates</h2>
          <NuxtLink :to="routes.news" class="text-sm font-medium text-maroon hover:underline">View all</NuxtLink>
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

      <!-- Accounts by Role -->
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 class="mb-4 text-base font-semibold text-gray-800">Accounts by role</h2>

        <div v-for="row in rolesBar" :key="row.label" class="mb-3 last:mb-0">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700">{{ row.label }}</span>
            <span class="text-sm font-semibold text-gray-900">{{ row.value }}</span>
          </div>
          <div class="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div class="h-full rounded-full" :class="row.color" :style="{ width: row.percent + '%' }"></div>
          </div>
        </div>
      </div>
    </section>

    <p class="mt-6 text-xs text-gray-500">
      Last updated: <span>{{ lastUpdated || '—' }}</span>
    </p>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import {
  collection, getCountFromServer, query, where, getDocs, orderBy, limit, type Firestore,
} from 'firebase/firestore'

import {
  User,
  Building2,
  Newspaper,
  CalendarFold,
  Download as DownloadIcon,
} from 'lucide-vue-next'


definePageMeta({ middleware: 'auth', layout: 'super-admin' })



// ---------- Router-aware dynamic routes ----------
const router = useRouter()
// replace this constant
// ---------- Router-aware dynamic routes ----------
const ROUTE_CANDIDATES = {
  news:        ['/admin/super-admin/news'],
  events:      ['/admin/super-admin/events'],
  downloads:   ['/admin/super-admin/downloads'],

  // ✅ point to the actual manage page; keep the folder as fallback
  departments: [
    '/admin/super-admin/manage_department',   // list/manage page (your file)
    '/admin/super-admin/departments'          // folder (only has [id].vue)
  ],

  accounts:    ['/admin/super-admin/manage_accounts'],
  gallery:     ['/admin/super-admin/gallery'],
  research:    [
    '/admin/super-admin/research',
    '/admin/super-admin/research/admission',
    '/admin/super-admin/research/faculty_staff',
  ],
}


const routes = reactive<Record<string, string>>({
  news: '/', events: '/', downloads: '/', research: '/',
  departments: '/', accounts: '/', gallery: '/',
})
// replace resolveFirstExisting with this
function resolveFirstExisting(paths: string[]) {
  const all = router.getRoutes()
  for (const base of paths) {
    const exists = all.some(r =>
      r.path === base ||                // exact match (/admin/.../events)
      r.path.startsWith(`${base}/:`)    // dynamic child (/admin/.../events/:id)
    )
    if (exists) return base
  }
  return paths[0] // safe fallback
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
const stats = ref({ accounts: 0, departments: 0, news: 0, events: 0, downloads: 0 })

async function countAll(path: string): Promise<number> {
  try { return (await getCountFromServer(collection(db, path))).data().count } catch { return 0 }
}
async function countPublished(path: string, field = 'published'): Promise<number> {
  try {
    const qRef = query(collection(db, path), where(field, '==', true))
    return (await getCountFromServer(qRef)).data().count
  } catch { return 0 }
}

// --- Accounts by role (SINGLE declaration) ---
const roles = ref({ superAdmin: 0, headAdmin: 0, faculty: 0 })
async function countByRole(role: string): Promise<number> {
  try {
    const qRef = query(collection(db, 'users'), where('role', '==', role))
    return (await getCountFromServer(qRef)).data().count
  } catch { return 0 }
}

// --- Recent feed ---
type FeedItem = {
  key: string
  type: 'News' | 'Event' | 'Download'
  title?: string
  preview?: string
  when?: Date | string | number
  manageTo: string
  icon: any
  iconColor: string
  bgRing: string
}
const IconByCollection: Record<'news' | 'events' | 'downloads', Component> = {
  news: Newspaper,
  events: CalendarFold,
  downloads: DownloadIcon,
}
async function recentFrom(
  path: 'news' | 'events' | 'downloads',
  tryFields: string[],
  typeLabel: 'News' | 'Event' | 'Download',
  baseListPath: string,
) {
   const decorate = (d: any, id: string) => {
    const title = d.title || d.name || d.fileName || d.heading || d.subject || `Untitled ${typeLabel}`
    const raw = d.summary || d.excerpt || d.description || d.content || ''
    const preview = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, '').slice(0, 120) : ''
    const when = d.publishedAt || d.createdAt || d.updatedAt || d.date || d.time || null

    const icon = IconByCollection[path]                     // ← Lucide component
    const iconColor = path === 'news' ? 'text-amber-600'
                    : path === 'events' ? 'text-fuchsia-600'
                    : 'text-indigo-600'
    const bgRing    = path === 'news' ? 'ring-amber-400/30 bg-amber-50'
                    : path === 'events' ? 'ring-fuchsia-400/30 bg-fuchsia-50'
                    : 'ring-indigo-400/30 bg-indigo-50'

    return {
      key: `${path}:${id}`,
      type: typeLabel,
      title,
      preview,
      when: (when?.toDate ? when.toDate() : when) as any,
      manageTo: docLink(baseListPath, id),
      icon, iconColor, bgRing,                               // ← used by <component :is="item.icon">
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

const recent = ref<FeedItem[]>([])
function formatTime(v: any) {
  const d = v instanceof Date ? v : new Date(v || Date.now())
  return d.toLocaleString()
}

// Quick actions from resolved routes
const quickActions = computed(() => [
  { to: routes.accounts,    label: 'Accounts',    icon: User,         color: 'text-sky-600',     ring: 'ring-sky-400/30 bg-sky-50' },
  { to: routes.departments, label: 'Departments', icon: Building2,     color: 'text-emerald-600', ring: 'ring-emerald-400/30 bg-emerald-50' },
  { to: routes.news,        label: 'News',        icon: Newspaper,     color: 'text-amber-600',   ring: 'ring-amber-400/30 bg-amber-50' },
  { to: routes.events,      label: 'Events',      icon: CalendarFold,  color: 'text-fuchsia-600', ring: 'ring-fuchsia-400/30 bg-fuchsia-50' },
  { to: routes.downloads,   label: 'Downloads',   icon: DownloadIcon,  color: 'text-indigo-600',  ring: 'ring-indigo-400/30 bg-indigo-50' },
  { to: routes.research,    label: 'Research',    icon: CalendarFold,  color: 'text-rose-600',    ring: 'ring-rose-400/30 bg-rose-50' },
])

// Roles bar uses the single `roles` ref
const rolesBar = computed(() => {
  const values = [roles.value.superAdmin, roles.value.headAdmin, roles.value.faculty]
  const max = Math.max(1, ...values)
  return [
    { label: 'Super Admin', value: roles.value.superAdmin, percent: Math.round((roles.value.superAdmin / max) * 100), color: 'bg-gray-900' },
    { label: 'Head Admin',  value: roles.value.headAdmin,  percent: Math.round((roles.value.headAdmin  / max) * 100), color: 'bg-teal-600' },
    { label: 'Faculty',     value: roles.value.faculty,    percent: Math.round((roles.value.faculty    / max) * 100), color: 'bg-sky-600' },
  ]
})

// Fetch everything
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

    const [sa, ha, fa] = await Promise.all([
      countByRole('Super Admin'),
      countByRole('Head Admin'),
      countByRole('Faculty'),
    ])
    roles.value = { superAdmin: sa, headAdmin: ha, faculty: fa }

    const [rNews, rEvents, rDownloads] = await Promise.all([
      recentFrom('news',      ['publishedAt', 'createdAt', 'updatedAt', 'date'], 'News',     routes.news),
      recentFrom('events',    ['createdAt', 'date', 'startDate'],                  'Event',    routes.events),
      recentFrom('downloads', ['createdAt', 'publishedAt'],                        'Download', routes.downloads),
    ])
    recent.value = [...rNews, ...rEvents, ...rDownloads]
      .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
      .slice(0, 8)

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
/* Stat cards (your existing styles) */
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
