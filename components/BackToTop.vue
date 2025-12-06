<template>
    <main>
        <transition name="fade-zoom">
            <UiButton class="fixed z-50 bg-red-600 hover:bg-red-500 hover:scale-105" @click="toTop" v-if="visible" :style="safeAreaStyle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-icon lucide-arrow-up size-4"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            </UiButton>
        </transition>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

    const visible = ref(false)
    const onScroll = () => {
    // show after ~400px scroll
    visible.value = (window.scrollY || document.documentElement.scrollTop) > 400
    }
    onMounted(() =>{
        onScroll()
        window.addEventListener('scroll', onScroll, {passive: true})
    })
    onBeforeUnmount(() =>{
        window.removeEventListener('scroll', onScroll)
    })
    
    const toTop = () => window.scrollTo({top:0, behavior: 'smooth'})

    // keep off iOS home indicator / notches
    const safeAreaStyle = computed(() => ({
    right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
    }))    
</script>

<style scoped>
.fade-zoom-enter-active,
.fade-zoom-leave-active { transition: opacity .18s, transform .18s; }
.fade-zoom-enter-from,
.fade-zoom-leave-to { opacity: 0; transform: scale(.9); }
</style>