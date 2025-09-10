<template>
  <div class="flex flex-col min-h-screen">
    <!-- Keep nav in ClientOnly to avoid SSR width mismatch -->
    <ClientOnly>
      <NavbarMobile v-if="isMobile" />
      <NavbarMain v-else />
      <template #fallback>
        <!-- Simple skeleton while hydrating -->
        <div class="h-[135px] w-full bg-neutral-100"></div>
      </template>
    </ClientOnly>

    <main class="flex-1 md:pt-[135px] pt-24">
      <div class="cet-content">
        <BackToTop />
        <slot />
      </div>
    </main>

    <!-- Footer (mobile/desktop variants) -->
    <ClientOnly>
      <FooterSecondaryFooterMobile v-if="isMobile" />
      <FooterSecondaryFooter v-else />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

/**
 * Tailwind 'sm' breakpoint = 640px.
 * We consider mobile when viewport is <= 639px.
 */
const isMobile = useMediaQuery('(max-width: 639px)')
</script>
