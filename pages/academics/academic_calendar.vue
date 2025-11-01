<template>
    <main class="flex items-center justify-center bg-white">
        <div class="relative w-3/4 mt-5">
            <div class="absolute right-0 z-10 md:right-28">    
                <UiButton class="flex flex-row p-2 text-sm font-semibold text-gray-800 transition bg-gray-200 rounded font-montserrat hover:scale-105 hover:bg-gray-300 ">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download size-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Download
                </UiButton>
            </div>
            <div class="flex justify-center pt-10">
                <img src="/public/images/vsu_calendar.jpg" alt="VSU Calendar" class="object-contain w-3/4 max-h-screen cursor-pointer min-w-64 min-h-56" @click="showModal = true">
            </div>
            <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center cursor-pointer bg-black/70" @click.self="showModal = false">
                <img src="/public/images/vsu_calendar.jpg" alt="VSU Calendar" class="object-cover max-w-4xl max-h-[90vh]"  @click.self="showModal = false">
            </div>
        </div>
    </main>
</template>

<script lang="ts" setup>
    definePageMeta({
        layout: 'custom',
    });
    const downloadImage = async () => {
        try {
            const response = await fetch('/images/vsu_calendar.jpg')
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = 'vsu_calendar.jpg'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Download failed:', error)
        }
    }
    
    const showModal = ref(false);
</script>

<style>
/* *  {
    outline: 1px solid red;
} */
</style>