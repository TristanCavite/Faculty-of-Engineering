<template>
  <header class="fixed z-10 w-full" :style="hideNav ? 'height: 120px;' : 'height: 30px;'">
    <!-- Header Bar with Search and Social Icons -->
    <transition name="header-sticky">
      <div class="bg-white border-gray-200 header-bar-transition">
        <div class="flex items-center justify-between w-full max-w-screen-xl px-4 mx-auto">
          <!-- Left: Social Icons -->
          <div class="flex items-center space-x-6">
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

          <!-- Logo (Center) -->
          <NuxtLink to="/" class="">
            <HeaderMain />
          </NuxtLink>

          <!-- Right: Search Bar -->
          <div class="relative my-1 w-38">
            <UiInput
              id="search"
              type="text"
              v-model="searchQuery"
              @keydown.enter="submitSearch"
              placeholder="Search"
              class="w-full h-10 pl-10 text-sm border-2 border-red-900 rounded-full bg-neutral-100 font-montserrat placeholder:text-black focus:outline-black focus:ring-0"
            />

            <span class="absolute inset-y-0 flex items-center text-white left-3">
              <Search class="text-red-900 fill-white" />
            </span>
          </div>
        </div>
      </div>
    </transition>

    <transition name="nav-fade-up">
      <nav  v-if="!hideNav" class="flex flex-col items-center w-full bg-red-900" :class="['flex w-full flex-col items-center', { 'nav-fixed': !hideNav }]">
        <UiTabs :value="visualTab" @update:value="handleTabChange">
          <UiTabsList  class="relative gap-2 bg-transparent h-11 text-foreground">
            <UiTabsTrigger value="home" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'home' ? 'bg-accent text-foreground' : '']">
              <NuxtLink to="/" class="flex items-center text-lg">
                <House/>
                Home
              </NuxtLink>
            </UiTabsTrigger>
            <UiTabsTrigger value="about" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'about' ? 'bg-accent text-foreground' : '']">
              <UiDropdownMenu>
                <UiDropdownMenuTrigger class="flex items-center space-x-1 text-lg">
                  <BadgeInfo />
                  About
                  <ChevronDown/>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent class="min-w-(--reka-dropdown-menu-trigger-width)">
                  <UiDropdownMenuItem>
                    <NuxtLink to="/about/faculty" class="flex items-center">
                      Faculty of Engineering
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem>
                    <NuxtLink to="/about/facilities" class="flex items-center">
                      Facilities
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem>
                    <NuxtLink to="/about/history" class="flex items-center">
                      History
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuSub>
                    <UiDropdownMenuSubTrigger>
                      Offices and Administration
                    </UiDropdownMenuSubTrigger>
                    <UiDropdownMenuSubContent >
                      <UiDropdownMenuItem v-for="dept in departments" :key="dept.id" >
                        <NuxtLink :to="`/about/dept_personels/${dept.id}`" class="flex items-center">
                           {{ dept.name }}
                        </NuxtLink>
                      </UiDropdownMenuItem>
                    </UiDropdownMenuSubContent>
                  </UiDropdownMenuSub>
                  <UiDropdownMenuItem>
                    <NuxtLink to="/about/map" class="flex items-center">
                      Map and Location
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem v-if="extra1Visible">
                    <NuxtLink :to="`/about/extra1`" class="flex items-center">
                      {{ extra1Label }}
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem v-if="extra2Visible">
                    <NuxtLink :to="`/about/extra2`" class="flex items-center">
                      {{ extra2Label }}
                    </NuxtLink>
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
            </UiTabsTrigger>
            <UiTabsTrigger value="academics" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'academics' ? 'bg-accent text-foreground' : '']">
              <UiDropdownMenu>
                <UiDropdownMenuTrigger class="flex items-center space-x-1 text-lg">
                  <Users/>
                  Academics
                  <ChevronDown/>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent class="min-w-(--reka-dropdown-menu-trigger-width)">
                  <UiDropdownMenuSub>
                    <UiDropdownMenuSubTrigger>
                      Degree Program
                    </UiDropdownMenuSubTrigger>
                    <UiDropdownMenuSubContent>
                      <UiDropdownMenuItem v-for="dept in departments" :key="dept.id" >
                        <NuxtLink :to="`/academics/departments/${dept.id}`" class="flex items-center">
                           {{ dept.name }}
                        </NuxtLink>
                      </UiDropdownMenuItem>
                    </UiDropdownMenuSubContent>
                  </UiDropdownMenuSub>
                  <UiDropdownMenuItem>
                    <NuxtLink to="/academics/academic_calendar" class="flex items-center">
                      Academic Calendar
                    </NuxtLink> 
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
            </UiTabsTrigger>
            <UiTabsTrigger value="admission" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'admission' ? 'bg-accent text-foreground' : '']">
              <UiDropdownMenu>
                <UiDropdownMenuTrigger class="flex items-center space-x-1 text-lg">
                  <Building/>
                  Admission
                  <ChevronDown/>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent class="min-w-(--reka-dropdown-menu-trigger-width)">
                  <UiDropdownMenuItem>
                    <NuxtLink to="/admission/why_choose_cet" class="flex items-center">
                      Why choose VSU?
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem v-if="undergradVisible">
                    <NuxtLink to="/admission/undergraduate" class="flex items-center">
                      Undergraduate
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem>
                    <NuxtLink to="/admission/graduate" class="flex items-center">
                      Graduate
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem v-if="admExtra1ShouldShow">
                    <NuxtLink :to="`/admission/extra1`" class="flex items-center">
                      {{ admExtra1Label }}
                    </NuxtLink>
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem v-if="admExtra2ShouldShow">
                    <NuxtLink :to="`/admission/extra2`" class="flex items-center">
                      {{ admExtra2Label }}
                    </NuxtLink>
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
            </UiTabsTrigger>
            <UiTabsTrigger value="research" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'research' ? 'bg-accent text-foreground' : '']">
              <NuxtLink to="/research/" class="flex items-center text-lg">
                <FlaskConical/>
                Research
              </NuxtLink>
            </UiTabsTrigger>
            <UiTabsTrigger value="news" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'news' ? 'bg-accent text-foreground' : '']">
              <NuxtLink to="/news/" class="flex items-center text-lg">
                <Newspaper/>
                News
              </NuxtLink>
            </UiTabsTrigger>
            <UiTabsTrigger value="download" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'download' ? 'bg-accent text-foreground' : '']">
              <NuxtLink to="/download/" class="flex items-center text-lg">
                <FileDown/>
                Download
              </NuxtLink>
            </UiTabsTrigger>
            <UiTabsTrigger value="obe" :class="['relative hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent', visualTab === 'obe' ? 'bg-accent text-foreground' : '']">
              <NuxtLink to="/obe/" class="flex items-center text-lg">
                <Award />
                OBE
              </NuxtLink>
            </UiTabsTrigger>
          </UiTabsList>
        </UiTabs>
      </nav>
    </transition>
  </header>
</template>

<script setup lang="ts">
  import { useSocialLinks } from "@/composables/useSocialLinks";
  import { signOut } from "firebase/auth";
  import { collection, doc, getDoc, getDocs } from "firebase/firestore";
  import { Facebook, Globe, Instagram, Linkedin, Twitter, Youtube, ChevronDown, Search, House, BadgeInfo, Users, Building, Clock, MapPin, School, FlaskConical, Newspaper, FileDown, Award, FolderPlus} from "lucide-vue-next";
  import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick} from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useDocument, useFirestore } from "vuefire";

  const departments = ref<any[]>([]);
  const router = useRouter();
  const route = useRoute();
  const searchQuery = ref("");
  
   // Auth
  const user = useCurrentUser();
  const auth = useFirebaseAuth();
  const departmentRefs = ref<HTMLElement[]>([]);
  const programDirections = ref<Record<number, "left" | "right">>({});

  const activeTab = computed(() => {
    const path = route.path;
    
    if (path === '/') return 'home';
    if (path.startsWith('/about')) return 'about';
    if (path.startsWith('/academics')) return 'academics';
    if (path.startsWith('/admission')) return 'admission';
    if (path.startsWith('/research')) return 'research';
    if (path.startsWith('/news')) return 'news';
    if (path.startsWith('/download')) return 'download';
    if (path.startsWith('/obe')) return 'obe';
    
    return 'home'; // default fallback
  });

  const visualTab = ref(activeTab.value);

  watch(
    () => route.path,
    async () => {
      visualTab.value = activeTab.value;
      await nextTick();
    }
  );
  const handleTabChange = (value: string) => {
    visualTab.value = value;
    switch (value) {
      case 'home':
        router.push('/');
        break;
      case 'about':
        break;
      case 'academics':
        break;
      case 'admission':
        break;
      case 'research':
        router.push('/research/');
        break;
      case 'news':
        router.push('/news/');
        break;
      case 'download':
        router.push('/download/');
        break;
      case 'obe':
        router.push('/obe/');
        break;
      default:
    }
  };

  // Firestore / vuefire
  const _db_for_extra_labels = useFirestore();
  const extra1Doc = useDocument(doc(_db_for_extra_labels, "about_sections", "extra_section_1"));
  const extra2Doc = useDocument(doc(_db_for_extra_labels, "about_sections", "extra_section_2"));
  const db = useFirestore();

  // Global flags doc (used elsewhere, reuse here)
  const flagsRef = doc(db, "settings", "public_flags");
  // Read flags (reactive)
  const { data: flags } = useDocument<Record<string, any>>(flagsRef);

  // === Admission extras reactive docs (new) ===
  const admExtra1Doc = useDocument(doc(db, "admission_sections", "extra_section_1"));
  const admExtra2Doc = useDocument(doc(db, "admission_sections", "extra_section_2"));

  // admission toggle (existing)
  const undergradVisible = computed(() => flags.value?.admissionUndergradVisible ?? true);

  const SOCIAL_ICONS: Record<string, any> = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    youtube: Youtube,
    linkedin: Linkedin,
    website: Globe,
  };

  // Labels (admin-saved title or fallback) for ABOUT extras (existing)
  const extra1Label = computed(() => {
    const t = extra1Doc.value?.title;
    return t && String(t).trim().length ? t : "Extra Section";
  });
  const extra2Label = computed(() => {
    const t = extra2Doc.value?.title;
    return t && String(t).trim().length ? t : "Extra Section";
  });

  // -----------------------
  // Visibility computed values for ABOUT extras (existing)
  // Preference: section doc.isVisible -> settings.public_flags.about_<id> -> default true
  // -----------------------
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

  // -----------------------
  // Admission extras: labels & visibility (NEW)
  // Preference: admission_sections/{id}.isVisible -> settings.public_flags.admission_extra_section_X -> default true
  // Label: admission_sections/{id}.title (must be non-empty)
  // -----------------------
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
  const admExtra2Visible = computed(() => {
    const secVal = admExtra2Doc.value?.isVisible;
    const flagVal = flags.value?.["admission_extra_section_2"];
    return typeof secVal !== "undefined" ? secVal : typeof flagVal !== "undefined" ? flagVal : true;
  });

  // require non-empty title to show (you said you want title to be used if present)
  const admExtra1HasTitle = computed(() => {
    const t = admExtra1Doc.value?.title;
    return !!(t && String(t).trim().length);
  });
  const admExtra2HasTitle = computed(() => {
    const t = admExtra2Doc.value?.title;
    return !!(t && String(t).trim().length);
  });

  // final guard used in template
  const admExtra1ShouldShow = computed(() => admExtra1Visible.value && admExtra1HasTitle.value);
  const admExtra2ShouldShow = computed(() => admExtra2Visible.value && admExtra2HasTitle.value);

  const { items: socialItems } = useSocialLinks();

  const logout = async () => {
    if (auth) {
      await signOut(auth);
      navigateTo("/");
    }
  };

  onMounted(async () => {
    try {
      const snapshot = await getDocs(collection(db, "departments"));
      departments.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed Dept",
      }));

      // warm a couple of admission docs + flags to reduce initial flicker
      // non-critical if fails
      try {
        await Promise.all([
          getDoc(doc(db, "admission_sections", "extra_section_1")),
          getDoc(doc(db, "admission_sections", "extra_section_2")),
          getDoc(flagsRef),
        ]);
      } catch (e) {
        // ignore warm errors
      }
    } catch (err) {
      console.error("🔥 Failed to load departments:", err);
    }
  });

  function getDropdownDirection(triggerEl: HTMLElement): "left" | "right" {
    const { right } = triggerEl.getBoundingClientRect();
    const spaceRight = window.innerWidth - right;
    return spaceRight < 320 ? "left" : "right";
  }
  function setProgramDirection(index: number) {
    const triggerEl = departmentRefs.value[index];
    if (triggerEl) {
      programDirections.value[index] = getDropdownDirection(triggerEl);
    }
  }

  // to hide header on scroll down
  const hideNav = ref(false);
  let lastScrollY = window.scrollY;

  function handleScroll() {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 80) {
      hideNav.value = true; // Hide when scrolling down
    } else {
      hideNav.value = false; // Show when scrolling up
    }
    lastScrollY = currentScrollY;
  }

  function submitSearch() {
    if (searchQuery.value.trim()) {
      router.push({ path: "/search", query: { q: searchQuery.value.trim() } });
    }
  }

  onMounted(() => {
    window.addEventListener("scroll", handleScroll);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleScroll);
  });

</script>

<style scoped>
  .js-tabs-indicator {
    will-change: transform, width, opacity;
  }

  /* HEADER (remains visible, no leave transition) */
  .header-sticky-enter-active {
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }
  .header-sticky-enter-from {
    opacity: 0;
    transform: translateY(10px);
  }
  .header-sticky-enter-to {
    opacity: 1;
    transform: translateY(0);
  }
  /* NO leave styles — it remains */

  /* NAVBAR fade up and disappear */
  .nav-fade-up-enter-active,
  .nav-fade-up-leave-active {
    transition:
      opacity 0.4s ease,
      transform 0.4s ease;
  }
  .nav-fade-up-enter-from {
    opacity: 0;
    transform: translateY(-20px);
  }
  .nav-fade-up-enter-to {
    opacity: 1;
    transform: translateY(0);
  }
  .nav-fade-up-leave-from {
    opacity: 1;
    transform: translateY(0);
  }
  .nav-fade-up-leave-to {
    opacity: 0;
    transform: translateY(-20px);
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }
  @keyframes slideUp {
    from {
      transform: translateY(50px);
    }
    to {
      transform: translateY(0);
    }
  }

  /* *{
    outline:1px solid red;
  } */
</style>
