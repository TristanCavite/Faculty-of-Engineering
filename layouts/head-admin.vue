<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <SidebarHeadAdminMain class="shrink-0"/>
    <!-- Page Content -->
    <div class="flex-1 overflow-auto">
      <slot />
    </div>
  </div>
</template>