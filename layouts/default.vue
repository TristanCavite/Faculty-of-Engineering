<template>
  <div class="flex flex-col min-h-screen">
    <NavbarMobile v-if="isMobile" />
    <NavbarMain v-else/>
    <main class="md:pt-[135px] pt-24 flex-1"> <!-- Adjusted for the height of the navbar -->
      <slot />
      <BackToTop /> 
    </main>
    <FooterMobile v-if="isMobile"/>
    <FooterMain v-else/>
  </div>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount } from 'vue'

    const isMobile = ref(window.innerWidth < 640)

    const handleResize = () => {
    isMobile.value = window.innerWidth < 640
    }

    onMounted(() => {
    window.addEventListener('resize', handleResize)
    })

    onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    })
</script>
