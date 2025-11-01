<template>
    <main class="bg-white">
        <div class="relative flex items-center w-full font-playfair ">
            <img src="/images/cet_map.jpg" alt="" class="object-cover w-full h-44 md:h-128">
            <div class="absolute top-16 md:top-40 left-6 md:left-[120px] md:px-4 md:py-4 px-2 py-2 bg-gray-700/90">
                <span class="text-xl text-white md:text-6xl">Map & Location</span>
            </div>
        </div>
        <div class="flex flex-col items-center w-full mx-auto mt-10 md:w-3/4">
            <div class="text-center">
                <span class="text-2xl font-bold text-red-900 md:text-5xl font-playfair">MAP AND LOCATION</span>
            </div>
            <div class="w-full mt-8 cursor-pointer md:w-3/4 md:mt-14">
                <iframe
                    width="100%" height="450" style="border:0"
                    src="https://maps.google.com/maps?q=10.7470925,124.7950265&z=19&output=embed"
                    allowfullscreen loading="lazy" class="w-full rounded">
                </iframe>
            </div>
            <div class="p-10 font-roboto">
                <span class="text-3xl font-bold">Direction to VSU</span>
                <br>
                <br>
                <p class="text-sm md:text-lg font-base">
                    The College of Engineering and Technology is located at the top of Visayas State University. Upon arriving at the main gate, it will take an estimated 10-minute walk.
                </p>
            </div>
        </div>
    </main>
</template>

<script>
    definePageMeta({
        layout: "custom",
    });
</script>

<style scoped>
/* * {
    outline: 1px solid red;
} */
</style>
