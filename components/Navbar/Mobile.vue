<template>
    <header class="fixed top-0 left-0 z-50 w-full bg-white">
        <div class="flex items-center justify-between w-full px-4">
           <!-- Left: Social Icons -->
           <div class="flex items-center space-x-4">
              <a
                v-for="it in socialItems"
                :key="it.key"
                :href="it.href"
                target="_blank"
                rel="noopener noreferrer"
                class="text-red-900 transition-opacity hover:opacity-80"
                :title="it.key"
                :aria-label="it.key"
                >
              <component
                :is="SOCIAL_ICONS[it.key] || Globe"
                class="text-red-900 size-5 fill-neutral-100 md:size-6"
              />
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
             <div class="absolute inset-y-0 flex items-center text-white left-3">
               <!-- Replace this with your search icon component if needed -->
               <Search class="text-red-900 fill-white" />
             </div>
            </div>
        </div>
         <!-- logo and navbar -->
        
        <div class="flex items-center w-full border-b-2 border-red-900">
            <UiCollapsible class="relative" v-model:open="mainMenuOpen">
                <UiCollapsibleTrigger>
                    <UiButton class="bg-transparent md:hidden hover:bg-gray-300">
                        <Menu class="text-red-900 cursor-pointer stroke-[2] size-8"/>
                    </UiButton>
                </UiCollapsibleTrigger>
                <UiCollapsibleContent class="px-4 py-2 space-y-5 w-72 max-w-[min(90vw,20rem)] max-h-[calc(100vh-10rem)] overflow-y-auto bg-slate-200/90 rounded absolute z-10 scrollbar-thin scrollbar-track-gray-200">
                    <NuxtLink to="/" class="flex items-center gap-1 text-lg font-semibold font-montserrat" @click="closeAllMenus">
                        <House class="text-red-900"/>
                        HOME
                    </NuxtLink>
                    <UiCollapsible class="w-full" v-model:open="aboutOpen">
                        <UiCollapsibleTrigger class="flex items-center justify-between w-full" @click.prevent>
                            <div class="flex items-center gap-1 text-lg font-semibold font-montserrat">
                                <BadgeInfo class="text-red-900"/>
                                ABOUT
                            </div>
                            <ChevronDown class="transition-transform size-4 stroke-[3]" :class="{ 'rotate-180': aboutOpen }"/>
                        </UiCollapsibleTrigger>
                        <UiCollapsibleContent class="pl-4 mt-4 space-y-5">
                            <NuxtLink to="/about/faculty" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">Faculty of Engineering</NuxtLink>
                            <NuxtLink to="/about/facilities" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">Facilities</NuxtLink>
                            <NuxtLink to="/about/history" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">History</NuxtLink>
                            <UiCollapsible class="w-full" v-model:open="officesOpen">
                                <UiCollapsibleTrigger class="flex items-center justify-between w-full" @click.prevent >
                                    <span class="text-lg font-semibold text-left font-montserrat">
                                        Offices and Administration
                                    </span>
                                    <ChevronDown class="transition-transform size-4 stroke-[3]" :class="{ 'rotate-180': officesOpen }"/>
                                </UiCollapsibleTrigger>
                                <UiCollapsibleContent class="pl-4 mt-4 space-y-5">
                                    <NuxtLink v-for="dept in departments" :key="dept.id" :to="`/about/dept_personels/${dept.id}`" class="flex text-lg font-semibold font-montserrat" @click="closeAllMenus">
                                        {{ dept.name }}
                                    </NuxtLink>
                                </UiCollapsibleContent>
                            </UiCollapsible>
                            <NuxtLink to="/about/map" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">Map and Location</NuxtLink>
                            <NuxtLink :to="`/about/extra1`" v-if="extra1Visible" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">{{ extra1Label }}</NuxtLink>
                            <NuxtLink :to="`/about/extra2`"  v-if="extra2Visible" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">{{ extra2Label }}</NuxtLink>
                        </UiCollapsibleContent>
                    </UiCollapsible>
                    <UiCollapsible class="w-full" v-model:open="academicsOpen">
                        <UiCollapsibleTrigger class="flex items-center justify-between w-full" @click.prevent>
                            <div class="flex items-center gap-1 text-lg font-semibold font-montserrat">
                                <GraduationCap class="text-red-900"/>
                                ACADEMICS
                            </div>
                            <ChevronDown class="transition-transform size-4 stroke-[3]" :class="{ 'rotate-180': academicsOpen }"/>
                        </UiCollapsibleTrigger>
                        <UiCollapsibleContent class="pl-4 mt-4 space-y-5">
                            <UiCollapsible>
                                <UiCollapsibleTrigger class="flex items-center justify-between w-full" @click.prevent>
                                    <div class="flex items-center gap-1 text-lg font-semibold font-montserrat">
                                        Degree Programs
                                    </div>
                                    <ChevronDown class="transition-transform size-4 stroke-[3]" :class="{ 'rotate-180': degreeProgramsOpen }"/>
                                </UiCollapsibleTrigger>
                                <UiCollapsibleContent class="pl-4 mt-4 space-y-2">
                                     <NuxtLink v-for="dept in departments" :key="dept.id" :to="`/about/dept_personels/${dept.id}`" class="flex text-lg font-semibold font-montserrat" @click="closeAllMenus">
                                        {{ dept.name }}
                                    </NuxtLink>
                                </UiCollapsibleContent>
                            </UiCollapsible>
                            <NuxtLink to="/academics/calendar" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">Academic Calendar</NuxtLink>
                        </UiCollapsibleContent>
                    </UiCollapsible>
                    <UiCollapsible class="w-full" v-model:open="admissionOpen">
                        <UiCollapsibleTrigger class="flex items-center justify-between w-full" @click.prevent>
                            <div class="flex items-center gap-1 text-lg font-semibold font-montserrat">
                                <UserCheck class="text-red-900"/>
                                ADMISSION
                            </div>
                            <ChevronDown class="transition-transform size-4 stroke-[3]" :class="{ 'rotate-180': admissionOpen }"/>
                        </UiCollapsibleTrigger>
                        <UiCollapsibleContent class="pl-4 mt-4 space-y-5">
                            <NuxtLink to="/admission/why_choose_cet" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">Why choose VSU?</NuxtLink>
                            <NuxtLink to="/admission/undergraduate" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">Undergraduate</NuxtLink>
                            <NuxtLink to="/admission/graduate" class="block text-lg font-semibold font-montserrat" @click="closeAllMenus">Graduate</NuxtLink>
                            <NuxtLink :to="`/admission/extra1`" v-if="admExtra1ShouldShow" class="flex items-center" @click="closeAllMenus">{{ admExtra1Label }}</NuxtLink>
                            <NuxtLink :to="`/admission/extra2`" v-if="admExtra2ShouldShow" class="flex items-center" @click="closeAllMenus">{{ admExtra2Label }}</NuxtLink>
                        </UiCollapsibleContent>
                    </UiCollapsible>
                    <NuxtLink to="/research" class="flex items-center gap-1 text-lg font-semibold font-montserrat" @click="closeAllMenus">
                        <FlaskConical class="text-red-900"/>
                        RESEARCH
                    </NuxtLink>
                    <NuxtLink to="/news" class="flex items-center gap-1 text-lg font-semibold font-montserrat" @click="closeAllMenus">
                        <Newspaper class="text-red-900"/>
                        NEWS
                    </NuxtLink>
                    <NuxtLink to="/download" class="flex items-center gap-1 text-lg font-semibold font-montserrat" @click="closeAllMenus">
                        <FileDown class="text-red-900"/>
                         DOWNLOAD
                    </NuxtLink>
                    <NuxtLink to="/obe/" class="flex items-center gap-1 text-lg font-semibold font-montserrat" @click="closeAllMenus">
                        <Award class="text-red-900"/>
                        OBE
                    </NuxtLink>
                </UiCollapsibleContent>
            </UiCollapsible>
            <NuxtLink to="/" class="flex items-center mx-auto">
                    <HeaderMain/>
            </NuxtLink>
        </div>
    </header>
</template>

<script setup lang="ts">  
    import { Facebook, Globe, Instagram, Linkedin, Twitter, Youtube, Menu, House, BadgeInfo,ChevronDown, Search,FlaskConical, Newspaper, FileDown, Award, GraduationCap, UserCheck} from "lucide-vue-next";
    import { ref } from 'vue';
    import { collection, doc, getDocs } from "firebase/firestore";
    import { useFirestore, useDocument } from "vuefire";

    const departments = ref<any[]>([]);
    const router = useRouter();
    const route = useRoute();
    const searchQuery = ref("");

    const { items: socialItems } = useSocialLinks();
    const SOCIAL_ICONS: Record<string, any> = {
        facebook: Facebook,
        instagram: Instagram,
        twitter: Twitter,
        youtube: Youtube,
        linkedin: Linkedin,
        website: Globe,
    };

    const aboutOpen = ref(false);
    watch(aboutOpen, (val) => {
        if (!val) aboutOpen.value = false;
    });

    const officesOpen = ref(false);
    watch(officesOpen, (val) => {
        if (!val) officesOpen.value = false;
    });

    const academicsOpen = ref(false);
    watch(academicsOpen, (val) => {
        if (!val) academicsOpen.value = false;
    });
    
    const degreeProgramsOpen = ref(false);
    watch(degreeProgramsOpen, (val) => {
        if (!val) degreeProgramsOpen.value = false;
    });

    // Add main menu state
    const mainMenuOpen = ref(false);

    // Function to close all menus
    function closeAllMenus() {
        mainMenuOpen.value = false;
        aboutOpen.value = false;
        officesOpen.value = false;
        academicsOpen.value = false;
        degreeProgramsOpen.value = false;
        admissionOpen.value = false;
    }

    const _db_for_extra_labels = useFirestore();
    const extra1Doc = useDocument(doc(_db_for_extra_labels, "about_sections", "extra_section_1"));
    const extra2Doc = useDocument(doc(_db_for_extra_labels, "about_sections", "extra_section_2"));
    const db = useFirestore();
    const flagsRef = doc(db, "settings", "public_flags");
    const { data: flags } = useDocument<Record<string, any>>(flagsRef);
    const admExtra1Doc = useDocument(doc(db, "admission_sections", "extra_section_1"));
    const admExtra2Doc = useDocument(doc(db, "admission_sections", "extra_section_2"));
    const admissionOpen = ref(false);
    watch(admissionOpen, (val) => {
        if (!val) admissionOpen.value = false;
    });

    const extra1Label = computed(() => {
    const t = extra1Doc.value?.title;
        return t && String(t).trim().length ? t : "Extra Section";
    });
    const extra2Label = computed(() => {
        const t = extra2Doc.value?.title;
        return t && String(t).trim().length ? t : "Extra Section";
    });

    const extra1Visible = computed(() => {
    const secVal = extra1Doc.value?.isVisible;
    const flagVal = flags.value?.["about_extra_section_1"];
        return typeof secVal !== "undefined" ? secVal : typeof flagVal !== "undefined" ? flagVal : true;
    });

    const extra2Visible = computed(() => {
        const secVal = extra2Doc.value?.isVisible;
        const flagVal = flags.value?.["about_extra_section_2"];
        return typeof secVal !== "undefined" ? secVal : typeof flagVal !== "undefined" ? flagVal : true;
    });

    const admExtra1Label = computed(() => {
    const t = admExtra1Doc.value?.title;
        return t && String(t).trim().length ? String(t) : "Extra Section";
    });
    const admExtra2Label = computed(() => {
        const t = admExtra2Doc.value?.title;
        return t && String(t).trim().length ? String(t) : "Extra Section";
    });

    const admExtra1Visible = computed(() => {
        const secVal = admExtra1Doc.value?.isVisible;
        const flagVal = flags.value?.["admission_extra_section_1"];
        return typeof secVal !== "undefined" ? secVal : typeof flagVal !== "undefined" ? flagVal : true;
    });

    const admExtra1HasTitle = computed(() => {
    const t = admExtra1Doc.value?.title;
        return !!(t && String(t).trim().length);
    });

    const admExtra2HasTitle = computed(() => {
        const t = admExtra2Doc.value?.title;
        return !!(t && String(t).trim().length);
    });

    const admExtra2Visible = computed(() => {
        const secVal = admExtra2Doc.value?.isVisible;
        const flagVal = flags.value?.["admission_extra_section_2"];
        return typeof secVal !== "undefined" ? secVal : typeof flagVal !== "undefined" ? flagVal : true;
    });

    const admExtra1ShouldShow = computed(() => admExtra1Visible.value && admExtra1HasTitle.value);
    const admExtra2ShouldShow = computed(() => admExtra2Visible.value && admExtra2HasTitle.value);

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