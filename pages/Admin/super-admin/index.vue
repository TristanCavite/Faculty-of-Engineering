<template>
    <!-- Main Content -->
    <main class="">
      <header class="">
        <span class="text-3xl font-bold">Admin Dashboard</span>
        <div>
          
          <span class="text-sm text-gray-600">Supper Admin</span>
        </div>
      </header>
      <section>
        <p>Welcome to the Admin Dashboard. Select a section to manage.</p>
      </section>
    </main>
  </template>
  
  <script setup>

// Apply middleware for authentication and role protection
definePageMeta({
  middleware: 'auth', // Protect this page
  layout: "super-admin", // Optional: use specific layout
});
</script>

  