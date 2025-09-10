<script setup lang="ts">
useHead({
  title: "Faculty of Engineering | Visayas State University",
  link: [
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",  // Explicit size declaration
      href: "/logoTab.png",
    },
    
  ],
  meta: [
    {
      name: "description",
      content: "Faculty of Engineering, Visayas State University",
    },
  ],
});
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>