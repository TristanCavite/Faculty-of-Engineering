<template>
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
      >
        <span v-if="!loading">Refresh</span>
        <span v-else>Updating…</span>
      </button>
    </header>

    <!-- Stat cards -->
    <section>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <AdminStatCard :icon="Info"        icon-color="text-cyan-600"    ring="ring-cyan-400/30 bg-cyan-50"
                       label="About"      :value="stats.about"     :loading="loading" sub="About sections" />
        <AdminStatCard :icon="BookOpen"    icon-color="text-emerald-600" ring="ring-emerald-400/30 bg-emerald-50"
                       label="Admission"  :value="stats.admission" :loading="loading" sub="Admission sections" />
        <AdminStatCard :icon="Newspaper"   icon-color="text-amber-600"   ring="ring-amber-400/30 bg-amber-50"
                       label="News (Published)" :value="stats.news" :loading="loading" sub="Live articles" />
        <AdminStatCard :icon="CalendarFold" icon-color="text-fuchsia-600" ring="ring-fuchsia-400/30 bg-fuchsia-50"
                       label="Events"     :value="stats.events"    :loading="loading" sub="Total events" />
        <AdminStatCard :icon="FlaskConical" icon-color="text-rose-600"    ring="ring-rose-400/30 bg-rose-50"
                       label="Research"   :value="stats.research"  :loading="loading" sub="Research entries" />
      </div>
    </section>

    <!-- Quick actions -->
    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold text-gray-600">Quick actions</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <AdminQuickAction :to="routes.about"     label="About"     :icon="Info"         color="text-cyan-600"    ring="ring-cyan-400/30 bg-cyan-50" />
        <AdminQuickAction :to="routes.admission" label="Admission" :icon="BookOpen"     color="text-emerald-600" ring="ring-emerald-400/30 bg-emerald-50" />
        <AdminQuickAction :to="routes.news"      label="News"      :icon="Newspaper"    color="text-amber-600"   ring="ring-amber-400/30 bg-amber-50" />
        <AdminQuickAction :to="routes.events"    label="Events"    :icon="CalendarFold" color="text-fuchsia-600" ring="ring-fuchsia-400/30 bg-fuchsia-50" />
        <AdminQuickAction :to="routes.research"  label="Research"  :icon="FlaskConical" color="text-rose-600"    ring="ring-rose-400/30 bg-rose-50" />
      </div>
    </section>

    <!-- Recent -->
    <section class="mt-8">
      <AdminRecentList :items="recent" :loading="loading" title="Recent updates">
        <template #action>
          <NuxtLink :to="routes.news" class="text-sm font-medium text-maroon hover:underline">View all news</NuxtLink>
        </template>
      </AdminRecentList>
    </section>

    <p class="mt-6 text-xs text-gray-500">Last updated: <span>{{ lastUpdated || '—' }}</span></p>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Info, BookOpen, Newspaper, CalendarFold, FlaskConical } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  roles: ['media_admin'],
  layout: 'media-admin',
})

// composable with all data/queries
import { useMediaDashboard } from '@/composables/useMediaDashboard'
const { routes, resolveAllRoutes, stats, recent, fetchAll, loading, lastUpdated } = useMediaDashboard()

// dumb UI components
import AdminStatCard from '@/components/Admin/StatCard.vue'
import AdminQuickAction from '@/components/Admin/QuickAction.vue'
import AdminRecentList from '@/components/Admin/RecentList.vue'

onMounted(async () => {
  resolveAllRoutes()
  await fetchAll()
})
</script>

<style scoped>
.bg-maroon { background-color: #7b1d20; }
.text-maroon { color: #7b1d20; }
</style>
