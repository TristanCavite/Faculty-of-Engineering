<template>
  <main class="p-6">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div>
        <span class="font-montserrat text-4xl font-bold text-red-900"> Admin Dashboard </span>
        <p class="text-sm text-gray-600">Super Admin</p>
      </div>
      <button
  @click="fetchAll()"
  :disabled="loading"
  class="rounded-lg bg-maroon px-4 py-2 font-semibold text-white shadow
         hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-60"
>
  <!-- normal state -->
  <span v-if="!loading" class="inline-flex items-center gap-2">
    <RefreshCw class="w-4 h-4" />
    <span>Refresh</span>
  </span>

  <!-- loading state -->
  <span v-else class="inline-flex items-center gap-2">
    <RefreshCw class="w-4 h-4 animate-spin" />
    <span>Updating…</span>
  </span>
</button>

    </header>

    <!-- Stat cards (reused StatCard component) -->
    <section>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <AdminStatCard
          :icon="User"
          icon-color="text-sky-600"
          ring="ring-sky-400/30 bg-sky-50"
          label="Accounts"
          :value="stats.accounts"
          :loading="loading"
          sub="All user roles"
        />
        <AdminStatCard
          :icon="Building2"
          icon-color="text-emerald-600"
          ring="ring-emerald-400/30 bg-emerald-50"
          label="Departments"
          :value="stats.departments"
          :loading="loading"
          sub="Active departments"
        />
        <AdminStatCard
          :icon="Newspaper"
          icon-color="text-amber-600"
          ring="ring-amber-400/30 bg-amber-50"
          label="News (Published)"
          :value="stats.news"
          :loading="loading"
          sub="Live articles"
        />
        <AdminStatCard
          :icon="CalendarFold"
          icon-color="text-fuchsia-600"
          ring="ring-fuchsia-400/30 bg-fuchsia-50"
          label="Events (Published)"
          :value="stats.events"
          :loading="loading"
          sub="Total events"
        />
        <AdminStatCard
          :icon="FlaskConical"
          icon-color="text-rose-600"
          ring="ring-rose-400/30 bg-rose-50"
          label="Research (Published)"
          :value="stats.research"
          :loading="loading"
          sub="Live studies"
        />
      </div>
    </section>

    <!-- Quick actions (reused QuickAction component) -->
    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold text-gray-600">Quick actions</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminQuickAction v-for="a in quickActions" :key="a.to" v-bind="a" />
      </div>
    </section>

    <!-- Recent + Roles -->
    <section class="mt-8 grid gap-6 xl:grid-cols-3">
      <!-- Recent updates (reused RecentList component) -->
      <AdminRecentList class="col-span-2" title="Recent updates" :items="recent" :loading="loading">
        <template #action>
          <NuxtLink :to="routes.news" class="text-sm font-medium text-maroon hover:underline">
            View all
          </NuxtLink>
        </template>
      </AdminRecentList>

      <!-- Roles visualization: Pie/Donut chart -->
      <AdminPieDonut
        title="Accounts by role"
        :rows="rolesDonutRows"
        :donut="true"
        :thickness="42"
        :showPercents="true"
        :rounded-caps="true"
        class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      />
    </section>

    <p class="mt-6 text-xs text-gray-500">
      Last updated: <span>{{ lastUpdated || "—" }}</span>
    </p>
  </main>
</template>

<script setup lang="ts">
  import AdminPieDonut from "@/components/Admin/PieDonut.vue";
  import AdminQuickAction from "@/components/Admin/QuickAction.vue";
  import AdminRecentList from "@/components/Admin/RecentList.vue";
  // Reused UI components
  import AdminStatCard from "@/components/Admin/StatCard.vue";
  // Super Admin data/composables
  import { useSuperDashboard } from "@/composables/useSuperDashboard";
  import {
    Building2,
    CalendarFold,
    RefreshCw,
    Download as DownloadIcon,
    FlaskConical,
    Newspaper,
    User,
  } from "lucide-vue-next";
  import { onMounted } from "vue";

  definePageMeta({
    middleware: ["auth"],
    roles: ["super_admin"],
    layout: "super-admin",
  });

  const {
    routes,
    resolveAllRoutes,
    stats,
    recent,
    fetchAll,
    loading,
    lastUpdated,
    quickActions,
    rolesDonutRows, // <-- use donut rows from composable
  } = useSuperDashboard();

  onMounted(async () => {
    resolveAllRoutes();
    await fetchAll();
  });
</script>

<style scoped>
  .bg-maroon {
    background-color: #7b1d20;
  }
  .text-maroon {
    color: #7b1d20;
  }
</style>
