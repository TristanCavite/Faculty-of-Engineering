<template>
    <header class="fixed top-0 left-0 z-50 w-full ">
        <div class="flex items-center justify-between w-full px-4 bg-white">
           <!-- Left: Social Icons -->
           <div class="flex items-center space-x-4">
             <a
               href="https://www.facebook.com/vsuengineering"
               target="_blank"
               rel="noopener noreferrer"
             >
               <Facebook class="text-red-900 size-5 fill-neutral-100" />
             </a>
             <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
               <Instagram class="text-red-900 size-5 fill-neutral-100" />
             </a>
             <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
               <Twitter class="text-red-900 size-5 fill-neutral-100" />
             </a>
           </div>
     
           <!-- Right: Search Bar -->
           <div class="relative w-32 my-2">
             <UiInput
               id="search"
               type="text"
               v-model="searchQuery"
              @keydown.enter="submitSearch"
               placeholder="Search"
               class="w-full h-8 pl-10 text-sm border-2 border-red-900 rounded-full bg-neutral-100 font-montserrat placeholder:text-black focus:outline-black focus:ring-0"
             />
             <span class="absolute inset-y-0 flex items-center text-white left-3">
               <!-- Replace this with your search icon component if needed -->
               <IconsSearch class="text-red-900 fill-white" />
             </span>
            </div>
        </div>
         <!-- logo and navbar -->
        <transition name="nav-slide">
            <div v-if="showNav" class="relative w-full px-4 bg-white border-b-2 border-red-900">
                <div class="flex items-center">
                    <button class=" md:hidden" aria-label="Open menu" @click="toggleMenu">
                        <Menu class="text-red-900 cursor-pointer stroke-[2] size-8"/>
                    </button>
                     <NuxtLink to="/" class="flex items-center mx-auto">
                         <HeaderMain/>
                    </NuxtLink>
                </div>
                <div v-if="showMenuBox" class="absolute left-0 z-40 w-full overflow-y-auto text-lg rounded-md shadow-xl top-12 md:hidden bg-neutral-700/90 font-montserrat max-h-96">
                    <!-- <button>
                        <X class="absolute text-red-800 cursor-pointer stroke-current right-2 top-4 w-7 h-7" @click="showMenuBox = false"/>
                    </button> -->
                    <ul class="flex flex-col p-4 pl-4 space-y-4 font-bold text-neutral-300">
                        <li><NuxtLink to="/" @click="showMenuBox = false" class="flex items-center w-full ">Home</NuxtLink></li>

                        <li>
                            <div class="flex items-center justify-between pr-3" :class="showAboutSubmenu ? 'bg-red-900 rounded-sm px-2 py-2' : ''" @click="showAboutSubmenu = !showAboutSubmenu">
                                <button>
                                    <span>About</span>
                                </button>
                                <ChevronDown class="transition-transform size-6 stroke-[3] " :class="{ 'rotate-180': showAboutSubmenu }"/>
                            </div>
                            
                            <!-- About menu box -->
                            <ul v-if="showAboutSubmenu" class="h-auto pt-4 pb-3 pl-4 space-y-4 font-semibold rounded-md left-full min-w-72">
                                <li><NuxtLink to="/about/faculty"  @click="closeAll" class="flex items-center w-full ">Faculty</NuxtLink></li>
                                <li><NuxtLink to="/about/facilities"  @click="closeAll" class="flex items-center w-full ">Facilities</NuxtLink></li>
                                <li><NuxtLink to="/about/history"  @click="closeAll" class="flex items-center w-full ">History</NuxtLink></li>
                                <li class="">
                                    <div class="flex items-center justify-between pr-3" :class="showOffAddSubmenu ? 'bg-red-900 rounded-sm px-2 py-2' : ''" @click.stop="showOffAddSubmenu = !showOffAddSubmenu">
                                        <button>
                                            <span>Offices and Administration</span>
                                        </button>
                                        <ChevronDown class="transition-transform size-6 stroke-[3] " :class="{ 'rotate-180': showOffAddSubmenu }"/>
                                    </div>

                                    <!-- Officess and Administration menu box -->
                                    <ul v-if="showOffAddSubmenu" class="h-auto pt-4 pb-3 pl-4 space-y-4 font-medium rounded-md left-full min-w-72">
                                        <NuxtLink to="/about/administration" @click="showMenuBox = false; showOffAddSubmenu = false">Offices and Administration</NuxtLink>
                                        <li v-for="dept in departments" :key="dept.id">
                                            <NuxtLink :to="`/about/dept_personels/${dept.id}`"  @click="showMenuBox = false; showOffAddSubmenu = false" class="flex items-center w-full ">
                                                {{ dept.name }}
                                            </NuxtLink>
                                        </li>
                                    </ul>
                                </li>
                                <li><NuxtLink to="/about/map" @click="showMenuBox = false">Map and Location</NuxtLink></li>
                            </ul>
                        </li>

                        <li>
                            <div class="flex items-center justify-between pr-3" :class="showAcademicsSubmenu ? 'bg-red-900 rounded-sm px-2 py-2' : ''" @click="showAcademicsSubmenu = !showAcademicsSubmenu">
                                <button>
                                    <span>Academics</span>
                                </button>
                                <ChevronDown class="transition-transform size-6 stroke-[3] " :class="{ 'rotate-180': showAcademicsSubmenu }"/>
                            </div>

                            <!-- academic sub menu -->
                             <ul  v-if="showAcademicsSubmenu" class="h-auto pt-4 pb-3 pl-4 space-y-4 font-semibold rounded-md left-full min-w-72">
                                <li v-for="dept in departments" :key="dept.id">
                                    <NuxtLink :to="`/academics/departments/${dept.id}`" @click="showMenuBox = false; showAcademicsSubmenu = false" class="flex items-center w-full ">
                                        {{ dept.name }}
                                    </NuxtLink>
                                </li>
                                <NuxtLink to="/academics/academic_calendar" @click="showMenuBox = false; showAcademicsSubmenu = false">Academic Calendar</NuxtLink>
                             </ul>
                        </li>

                        <li>
                            <div class="flex items-center justify-between pr-3" :class="showAdmissionSubmenu ? 'bg-red-900 rounded-sm px-2 py-2' : ''" @click="showAdmissionSubmenu = !showAdmissionSubmenu">
                                <button>
                                    <span>Admission</span>
                                </button>
                                <ChevronDown class="transition-transform size-6 stroke-[3] " :class="{ 'rotate-180': showAdmissionSubmenu }"/>
                            </div>
                            <ul  v-if="showAdmissionSubmenu" class="h-auto pt-4 pb-3 pl-4 space-y-4 font-semibold rounded-md left-full min-w-72">
                                <li><NuxtLink to="/admission/graduate" class="flex items-center w-full" @click="showMenuBox = false; showAdmissionSubmenu = false"> Graduate</NuxtLink></li>
                                <li><NuxtLink to="/admission/undergraduate" class="flex items-center w-full"  @click="showMenuBox = false; showAdmissionSubmenu = false">Undergraduate</NuxtLink></li>
                                <li><NuxtLink to="/admission/why_choose_cet" class="flex items-center w-full" @click="showMenuBox = false; showAdmissionSubmenu = false">Why Choose VSU-FE?</NuxtLink></li>
                            </ul>
                        </li>

                        <li><NuxtLink to="/research" class="flex items-center w-full" @click="showMenuBox = false">Research</NuxtLink></li>
                        <li><NuxtLink to="/news" class="flex items-center w-full" @click="showMenuBox = false">News</NuxtLink></li>
                        <li><NuxtLink to="/download" class="flex items-center w-full" @click="showMenuBox = false">Download</NuxtLink></li>
                    </ul>
                </div>
            </div>
        </transition>
    </header>
</template>

<script setup lang="ts">
    import ChevronDown from "@/components/Icons/ChevronDown.vue";
    import { Facebook, Instagram, Twitter, Menu,  X} from "lucide-vue-next";
    import { ref } from 'vue';
    import { collection, getDocs } from "firebase/firestore";
    import { useFirestore } from "vuefire";

    const showNav = ref(true);
    let lastScrollY = window.scrollY

    const handleScroll = () => {
    const currentScroll = window.scrollY;
    // Only hide nav if menu is NOT open
    if (!showMenuBox.value) {
        showNav.value = currentScroll < lastScrollY || currentScroll <= 0;
    } else {
        showNav.value = true;
    }
    lastScrollY = currentScroll;
    }

    onMounted(() => {
    window.addEventListener('scroll', handleScroll)
    })

    onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll)
    })

    // for menu box
    const showMenuBox = ref(false);
    function closeAll() {
    showMenuBox.value = false
    showAboutSubmenu.value = false
    showOffAddSubmenu.value = false
    showAcademicsSubmenu.value = false
    showAboutSubmenu.value = false
    showAdmissionSubmenu.value = false
    }

    function toggleMenu() {
    if (showMenuBox.value) {
        closeAll();
    } else {
        closeAll();
        showMenuBox.value = true;
    }
}

    // for submenu box
    const showAboutSubmenu = ref(false);
    watch(showAboutSubmenu, (val) => {
        if (!val) showOffAddSubmenu.value = false;
    });

    // for offices and administration submenu
    const showOffAddSubmenu = ref(false);

    // for academics submenu
    const showAcademicsSubmenu = ref(false);
    watch(showAcademicsSubmenu, (val) => {
        if (!val) showAcademicsSubmenu.value = false;
    });

    // for admission submenu
    const showAdmissionSubmenu = ref(false);
    watch(showAdmissionSubmenu, (val) => {
        if (!val) showAdmissionSubmenu.value = false;
    });
    
    // for departments
    const departments = ref<any[]>([]);
    const departmentRefs = ref<HTMLElement[]>([]);
     const router = useRouter();
    const searchQuery = ref("");
    const db = useFirestore();

    onMounted(async () => {
    try {
        const snapshot = await getDocs(collection(db, "departments"));
        departments.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed Dept",
        }));
    } catch (err) {
        console.error("🔥 Failed to load departments:", err);
    }
    });

      function submitSearch() {
    if (searchQuery.value.trim()) {
      router.push({ path: "/search", query: { q: searchQuery.value.trim() } });
    }
  }
</script>

<style scoped>
    .nav-slide-enter-active,
    .nav-slide-leave-active {
    transition: opacity 0.4s, transform 0.4s;
    }
    .nav-slide-enter-from,
    .nav-slide-leave-to {
    opacity: 0;
    transform: translateY(-100%); /* adjust as needed */
    }
    .nav-slide-enter-to,
    .nav-slide-leave-from {
    opacity: 1;
    transform: translateY(0);
    }

    /* *{
        outline: 1px red solid;
    } */
    
    /* for menubox */
    .menu-slide-left-enter-active,
    .menu-slide-left-leave-active {
    transition: all 0.3s ease;
    }
    .menu-slide-left-enter-from {
    opacity: 0;
    transform: translateX(-100%);
    }
    .menu-slide-left-enter-to {
    opacity: 1;
    transform: translateX(0);
    }
    .menu-slide-left-leave-from {
    opacity: 1;
    transform: translateX(0);
    }
    .menu-slide-left-leave-to {
    opacity: 0;
    transform: translateX(-100%);
    }

    /* for scroll bar */

    /* *{
        outline:1px solid red;
    } */
</style>