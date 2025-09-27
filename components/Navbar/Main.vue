<template>
  <header class="fixed z-50 w-full" :style="hideNav ? 'height: 120px;' : 'height: 30px;'">
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
              <IconsSearch class="text-red-900 fill-white" />
            </span>
          </div>
        </div>
      </div>
    </transition>

    <!-- Navigation Bar -->
    <transition name="nav-fade-up">
      <nav
        v-if="!hideNav"
        class="flex flex-col items-center w-full bg-red-900"
        :class="['flex w-full flex-col items-center', { 'nav-fixed': !hideNav }]"
      >
        <!-- Login/Logout and Tabs (Bottom Section) -->
        <div class="w-full">
          <!-- Background full-width but content centered inside -->
          <div class="w-full border shadow-lg">
            <div class="w-full max-w-screen-xl mx-auto">
              <Tabs default-value="home">
                <TabsList
                  class="flex items-center justify-center gap-12 text-lg text-white cursor-pointer font-montserrat"
                >
                  <!-- Home -->
                  <NuxtLink
                    to="/"
                    class="flex items-center h-12 pb-0 font-semibold border-b-2 border-transparent font-montserrat hover:border-yellow-500 hover:text-yellow-500"
                    exact-active-class="px-2 py-1 bg-yellow-400 rounded"
                  >
                    Home
                  </NuxtLink>

                  <!-- About Dropdown -->
                  <div class="relative group">
                    <TabsTrigger
                      value="about"
                      :class="[
                        'flex items-center h-12 gap-1 pb-0 font-semibold border-b-2 border-transparent font-montserrat group-hover:border-yellow-500 group-hover:text-yellow-500',
                        isAboutActive ? 'px-2 py-1 bg-yellow-400 rounded' : 'text-white'
                      ]"
                    >
                      About
                      <ChevronDown class="w-4 h-4 group-hover:text-yellow-500" />
                    </TabsTrigger>

                    <div
                      class="absolute z-50 mt-1 hidden w-80 bg-[#342E2E]  shadow-lg group-hover:block"
                    >
                      <NuxtLink
                        to="/about/faculty"
                        class="block px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                      >
                        The Faculty of Engineering
                      </NuxtLink>

                      <NuxtLink
                        to="/about/facilities"
                        class="block px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                      >
                        Facilities
                      </NuxtLink>

                      <NuxtLink
                        to="/about/history"
                        class="block px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                      >
                        History
                      </NuxtLink>

                      <!-- 🏢 Offices and Administration with dynamic departments -->
                      <div class="relative border-b border-gray-500 group/admin hover:bg-gray-700">
                        <div class="flex justify-between px-4 py-2 cursor-pointer">
                          <NuxtLink to="/about/administration" class="flex justify-between w-full">
                            Offices and Administration <span class="text-yellow-500">▶</span>
                          </NuxtLink>
                        </div>

                        <!-- 2nd level submenu: departments -->
                        <div
                          class="absolute left-full top-0 z-30 hidden w-[320px] bg-[#342E2E] shadow-lg group-hover/admin:block"
                        >
                          <NuxtLink
                            v-for="dept in departments"
                            :key="dept.id"
                            :to="`/about/dept_personels/${dept.id}`"
                            class="block px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                          >
                            {{ dept.name }}
                          </NuxtLink>
                        </div>
                      </div>

                      <NuxtLink to="/about/map" class="block px-4 py-2 hover:bg-gray-700">
                        Map and Location
                      </NuxtLink>

                      <!-- EXTRA LINKS: only show if visible flag/doc allows -->
                      <NuxtLink
                        v-if="extra1Visible"
                        to="/about/extra1"
                        class="block px-4 py-2 hover:bg-gray-700"
                      >
                        {{ extra1Label }}
                      </NuxtLink>

                      <NuxtLink
                        v-if="extra2Visible"
                        to="/about/extra2"
                        class="block px-4 py-2 hover:bg-gray-700"
                      >
                        {{ extra2Label }}
                      </NuxtLink>
                    </div>
                  </div>

                  <!-- ✅ Academics Dropdown -->
                  <div class="relative group">
                    <TabsTrigger
                      value="academics"
                      :class="[
                        'flex items-center gap-1 h-12 font-semibold border-b-2 border-transparent font-montserrat group-hover:border-yellow-500 group-hover:text-yellow-500',
                        isAcademicsActive ? 'px-2 py-1  bg-yellow-400 rounded' : 'text-white'
                      ]"
                    >
                      Academics
                      <ChevronDown class="w-4 h-4 group-hover:text-yellow-500"/>
                    </TabsTrigger>

                    <!-- First-Level Dropdown -->
                    <div
                      class="absolute z-50 hidden min-w-[260px] bg-[#342E2E]  group-hover:block"
                    >
                      <div class="flex flex-col">
                        <!-- 📁 Degree Program Dropdown -->
                        <div
                          class="relative px-4 py-2 border-b border-gray-500 cursor-pointer group/degree hover:bg-gray-700"
                        >
                          <div class="flex items-center justify-between">
                            <span>Degree Program</span>
                            <span class="text-yellow-500">▶</span>
                          </div>

                          <!-- Departments (Second-Level Dropdown) -->
                          <div
                            class="absolute left-full top-0 z-50 hidden w-[300px] flex-col bg-[#342E2E] shadow-lg group-hover/degree:flex"
                          >
                            <NuxtLink
                              v-for="dept in departments"
                              :key="dept.id"
                              :to="`/academics/departments/${dept.id}`"
                              class="px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                            >
                              {{ dept.name }}
                            </NuxtLink>
                          </div>
                        </div>

                        <!-- 📅 Academic Calendar -->
                        <NuxtLink
                          to="/academics/academic_calendar"
                          class="block px-4 py-2 hover:bg-gray-700"
                        >
                          Academic Calendar
                        </NuxtLink>
                      </div>
                    </div>
                  </div>

                  <!-- Admission Dropdown -->
                  <div class="relative group">
                    <TabsTrigger
                      value="admission"
                      :class="[
                        'flex items-center gap-1 h-12 pb-0 font-semibold border-b-2 border-transparent font-montserrat group-hover:border-yellow-500 group-hover:text-yellow-500',
                        isAdmissionActive ? 'px-2 py-1 bg-yellow-400 rounded' : 'text-white'
                      ]"
                    >
                      Admission
                      <ChevronDown class="w-4 h-4 group-hover:text-yellow-500"/>
                    </TabsTrigger>

                    <div
                      class="absolute z-50 mt-1 hidden w-56 bg-[#342E2E] text-white shadow-lg group-hover:block"
                    >
                      <NuxtLink
                        to="/admission/why_choose_cet"
                        class="block px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                      >
                        Why choose VSU?
                      </NuxtLink>

                      <!-- 👇 This one hides/shows live based on Firestore -->
                    
                        <NuxtLink
                          v-if="undergradVisible"
                          to="/admission/undergraduate"
                          class="block px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                        >
                          Undergraduate
                        </NuxtLink>
                     

                      <NuxtLink to="/admission/graduate" class="block px-4 py-2 hover:bg-gray-700">
                        Graduate
                      </NuxtLink>

                      <NuxtLink
                        v-if="admExtra1ShouldShow"
                        to="/admission/extra1"
                        class="block px-4 py-2 border-b border-gray-500 hover:bg-gray-700"
                      >
                        {{ admExtra1Label }}
                      </NuxtLink>

                      <NuxtLink
                        v-if="admExtra2ShouldShow"
                        to="/admission/extra2"
                        class="block px-4 py-2 hover:bg-gray-700"
                      >
                        {{ admExtra2Label }}
                      </NuxtLink>
                    </div>
                  </div>

                  <!-- Research -->
                  <NuxtLink
                    to="/research/"
                    class="flex items-center h-12 pb-0 font-semibold border-b-2 border-transparent hover:border-yellow-500 hover:text-yellow-500"
                    exact-active-class="px-2 py-1 bg-yellow-400 rounded"
                  >
                    Research
                  </NuxtLink>

                  <!-- News -->
                  <NuxtLink
                    to="/news/"
                    class="flex items-center h-12 pb-0 font-semibold border-b-2 border-transparent hover:border-yellow-500 hover:text-yellow-500"
                    exact-active-class="px-2 py-1 bg-yellow-400 rounded"
                  >
                    News
                  </NuxtLink>

                  <NuxtLink
                    to="/download/"
                    class="flex items-center h-12 pb-0 font-semibold border-b-2 border-transparent hover:border-yellow-500 hover:text-yellow-500"
                    exact-active-class="px-2 py-1 bg-yellow-400 rounded"
                  >
                    Download
                  </NuxtLink>

                  <NuxtLink
                    to="/obe/"
                    class="flex items-center h-12 pb-0 font-semibold border-b-2 border-transparent hover:border-yellow-500 hover:text-yellow-500"
                    exact-active-class="px-2 py-1 bg-yellow-400 rounded"
                  >
                    OBE
                  </NuxtLink>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </nav>
    </transition>
  </header>
</template>

<script setup lang="ts">
  import ChevronDown from "@/components/Icons/ChevronDown.vue";
  import IconsSearch from "@/components/Icons/Search.vue";
  import { useSocialLinks } from "@/composables/useSocialLinks";
  import { signOut } from "firebase/auth";
  import { collection, doc, getDoc, getDocs } from "firebase/firestore";
  import { Facebook, Globe, Instagram, Linkedin, Twitter, Youtube } from "lucide-vue-next";
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useDocument, useFirestore } from "vuefire";

  // Auth
  const user = useCurrentUser();
  const auth = useFirebaseAuth();
  const departmentRefs = ref<HTMLElement[]>([]);
  const programDirections = ref<Record<number, "left" | "right">>({});

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

  const departments = ref<any[]>([]);
  const router = useRouter();
  const route = useRoute();
  const searchQuery = ref("");

  // Computed properties to determine active tabs based on current route
  const isAboutActive = computed(() => {
    return route.path.startsWith('/about');
  });

  const isAcademicsActive = computed(() => {
    return route.path.startsWith('/academics');
  });

  const isAdmissionActive = computed(() => {
    return route.path.startsWith('/admission');
  });

  const isResearchActive = computed(() => {
    return route.path.startsWith('/research');
  });

  const isNewsActive = computed(() => {
    return route.path.startsWith('/news');
  });

  const isDownloadActive = computed(() => {
    return route.path.startsWith('/download');
  });

  const isObeActive = computed(() => {
    return route.path.startsWith('/obe');
  });

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
  .hover\:border-yellow-500:hover {
    border-bottom-color: #ffd700;
  }

  .hover\:text-yellow-500:hover {
    color: #ffd700;
  }

  .absolute {
    margin: 0;
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
