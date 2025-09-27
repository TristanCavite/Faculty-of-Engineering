<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-10">
    <h1 class="text-3xl font-bold text-maroon">
      Search Results for: <span class="italic">"{{ route.query.q }}"</span>
    </h1>

    <div v-if="loading" class="min-h-[60vh]">
      <UiSearchSkeleton />
    </div>

    <!-- Render content only when not loading -->
    <template v-if="!loading">
      <!-- No Results -->
      <div v-if="paginatedResults.length === 0" class="text-gray-600">No results found.</div>

      <!-- Results -->
      <div v-else class="space-y-6">
        <div
          v-for="item in paginatedResults"
          :key="item.url"
          class="rounded border bg-white p-4 shadow transition hover:shadow-lg"
        >
          <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {{ item.tag }}
          </div>

          <NuxtLink
            :to="item.url"
            class="mb-1 inline-block text-xl font-bold text-maroon transition hover:underline"
          >
            {{ item.title }}
          </NuxtLink>

          <p v-if="item.displayDate" class="mb-2 text-sm text-gray-500">
            {{ item.displayDate }}
          </p>

          <p class="line-clamp-3 text-gray-700">
            {{ item.snippet }}
          </p>

          <NuxtLink :to="item.url" class="mt-2 inline-block text-sm text-red-800 hover:underline">
            Read more →
          </NuxtLink>
        </div>

        <!-- Pagination -->
        <div
          class="flex flex-wrap items-center justify-center gap-2 pt-6 text-sm font-medium text-maroon"
        >
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-2 py-1 hover:underline disabled:opacity-40"
          >
            Prev
          </button>

          <button
            v-for="n in totalPages"
            :key="n"
            @click="goToPage(n)"
            :class="[
              'h-8 w-8 border transition',
              n === currentPage ? 'bg-gray-200 text-maroon' : 'hover:underline',
            ]"
          >
            {{ n }}
          </button>

          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-2 py-1 hover:underline disabled:opacity-40"
          >
            Next
          </button>
          <button
            @click="goToPage(totalPages)"
            :disabled="currentPage === totalPages"
            class="px-2 py-1 hover:underline disabled:opacity-40"
          >
            End
          </button>
        </div>
      </div>
    </template>

    <!-- Fullscreen spinning-logo overlay -->
    <UiLoadingOverlay :show="loading" label="Searching…" logo="/logoTab.png" />
  </div>
</template>
<script setup lang="ts">
  /**
   * Full search script (parallelized + robust loader).
   * - Runs all Firestore reads in parallel via Promise.all
   * - Uses collectionGroup('degreePrograms') to avoid per-department loops
   * - Always hides loader via try/finally
   */

  import { collection, collectionGroup, doc, getDoc, getDocs } from "firebase/firestore";
  import { computed, ref, watchEffect } from "vue";
  import { useRoute } from "vue-router";
  import { useFirestore } from "vuefire";

  definePageMeta({ layout: "default" });

  /** ---------- utils ---------- */

  /** Strip all HTML tags and collapse whitespace */
  function stripHtml(html: string | undefined) {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Truncate text to n characters, add ellipsis */
  function truncate(text: string, n = 220) {
    if (!text) return "";
    return text.length > n ? text.slice(0, n) + "…" : text;
  }

  /** Firestore Timestamp | ISO string → Date | null */
  function tsToDate(ts: any): Date | null {
    if (!ts) return null;
    if (ts?.toDate) return ts.toDate() as Date;
    if (typeof ts === "string") {
      const d = new Date(ts);
      return isNaN(+d) ? null : d;
    }
    return null;
  }

  /** Format date as "Month D, YYYY" */
  function fmtDate(d: Date | null | undefined) {
    if (!d) return "";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /** ---------- routing maps for static pages ---------- */
  const ABOUT_PAGE_MAP: Record<string, { title: string; url: string }> = {
    the_college: { title: "The Faculty of Engineering", url: "/about/faculty" },
    facilities: { title: "Facilities", url: "/about/facilities" },
    history: { title: "History", url: "/about/history" },
    map: { title: "Map and Location", url: "/about/map" },
  };

  const ADMISSION_PAGE_MAP: Record<string, { title: string; url: string }> = {
    // keep both keys to be safe with existing docs
    why_choose_vsu: { title: "Why choose VSU?", url: "/admission/why_choose_cet" },
    why_choose_cet: { title: "Why choose VSU?", url: "/admission/why_choose_cet" },
    undergraduate: { title: "Undergraduate", url: "/admission/undergraduate" },
    graduate: { title: "Graduate", url: "/admission/graduate" },
  };

  /** ---------- state ---------- */
  const db = useFirestore();
  const route = useRoute();

  /** Controls the spinning-logo overlay */
  const loading = ref(false);

  /** Unified result type for the list */
  type Result = {
    title: string;
    url: string;
    tag: string;
    snippet: string;
    date?: Date | null;
    displayDate?: string;
  };

  const allResults = ref<Result[]>([]);

  /** Cache department names by id to avoid extra reads */
  const deptNameById = new Map<string, string>();

  /** ---------- pagination ---------- */
  const currentPage = ref(1);
  const itemsPerPage = 5;

  const totalPages = computed(() => Math.max(1, Math.ceil(allResults.value.length / itemsPerPage)));

  const paginatedResults = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return allResults.value.slice(start, start + itemsPerPage);
  });

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /** ---------- main search ---------- */
  watchEffect(async () => {
    loading.value = true; // show overlay immediately
    try {
      // normalize query
      const q = ((route.query.q as string) || "").trim();
      currentPage.value = 1;
      allResults.value = [];

      // no query → nothing to fetch
      if (!q) return;
      const needle = q.toLowerCase();

      // Fire ALL reads in parallel (1 round-trip each)
      const [
        depSnap, // departments
        aboutSnap, // about_sections
        admSnap, // admission_sections
        cwDoc, // college_faculty_staff/college-wide
        deptPagesSnap, // department_pages
        newsSnap, // news
        eventsSnap, // events
        researchSnap, // researches
        downloadsSnap, // downloads
        obeDoc, // obe_page/main
        progGroupSnap, // collectionGroup('degreePrograms')
      ] = await Promise.all([
        getDocs(collection(db, "departments")),
        getDocs(collection(db, "about_sections")),
        getDocs(collection(db, "admission_sections")),
        getDoc(doc(db, "college_faculty_staff", "college-wide")),
        getDocs(collection(db, "department_pages")),
        getDocs(collection(db, "news")),
        getDocs(collection(db, "events")),
        getDocs(collection(db, "researches")),
        getDocs(collection(db, "downloads")),
        getDoc(doc(db, "obe_page", "main")),
        getDocs(collectionGroup(db, "degreePrograms")),
      ]);

      // Build department name map once
      deptNameById.clear();
      for (const d of depSnap.docs) {
        const id = d.id;
        const data: any = d.data();
        deptNameById.set(id, data?.name || "Department");
      }

      /** Collect matches */
      const bucket: Result[] = [];

      /** About */
      for (const d of aboutSnap.docs) {
        const id = d.id;
        const data: any = d.data();
        const hay = `${id} ${stripHtml(data?.content)}`.toLowerCase();
        const meta = ABOUT_PAGE_MAP[id];
        if (meta && hay.includes(needle)) {
          bucket.push({
            title: meta.title,
            url: meta.url,
            tag: "About",
            snippet: truncate(stripHtml(data?.content)),
          });
        }
      }

      /** Admission */
      for (const d of admSnap.docs) {
        const id = d.id;
        const data: any = d.data();
        const hay = `${id} ${stripHtml(data?.content)}`.toLowerCase();
        const meta = ADMISSION_PAGE_MAP[id];
        if (meta && hay.includes(needle)) {
          bucket.push({
            title: meta.title,
            url: meta.url,
            tag: "Admission",
            snippet: truncate(stripHtml(data?.content)),
          });
        }
      }

      /** Administration (college-wide) */
      if (cwDoc.exists()) {
        const data: any = cwDoc.data();
        const pools: any[] = [];
        if (Array.isArray(data?.adminStaff)) pools.push(...data.adminStaff);
        if (Array.isArray(data?.departmentHeads)) pools.push(...data.departmentHeads);
        if (data?.collegeDean) pools.push(data.collegeDean);
        if (data?.collegeSecretary) pools.push(data.collegeSecretary);

        for (const p of pools) {
          const hay = JSON.stringify(p).toLowerCase();
          if (hay.includes(needle)) {
            const name = p.fullName || p.name || "College Personnel";
            bucket.push({
              title: name,
              url: "/about/administration",
              tag: "Facilities and Administration",
              snippet: truncate(
                [p.designation, stripHtml(p.educationHtml)].filter(Boolean).join(" — ")
              ),
            });
          }
        }
      }

      /** Departments: personnel (single pass) */
      for (const d of depSnap.docs) {
        const id = d.id;
        const data: any = d.data();
        const deptName = deptNameById.get(id) || "Department";

        // Department head
        const head = data?.headAdmin;
        if (head && JSON.stringify(head).toLowerCase().includes(needle)) {
          const name = head.fullName || head.name || "Department Head";
          bucket.push({
            title: `${name} — ${deptName}`,
            url: `/about/dept_personels/${id}`,
            tag: "Department Personnel",
            snippet: truncate(
              [head.designation, stripHtml(head.educationHtml)].filter(Boolean).join(" — ")
            ),
          });
        }

        // Staff
        if (Array.isArray(data?.staff)) {
          for (const s of data.staff) {
            if (JSON.stringify(s).toLowerCase().includes(needle)) {
              const name = s.fullName || s.name || "Department Staff";
              bucket.push({
                title: `${name} — ${deptName}`,
                url: `/about/dept_personels/${id}`,
                tag: "Department Personnel",
                snippet: truncate(
                  [s.designation, stripHtml(s.educationHtml)].filter(Boolean).join(" — ")
                ),
              });
            }
          }
        }
      }

      /** Department pages (content + dept name) */
      for (const d of deptPagesSnap.docs) {
        const id = d.id;
        const data: any = d.data();
        const deptName = deptNameById.get(id) || "Department";
        const hay = `${deptName} ${stripHtml(data?.content)}`.toLowerCase();
        if (hay.includes(needle)) {
          bucket.push({
            title: deptName,
            url: `/academics/departments/${id}`,
            tag: "Academics",
            snippet: truncate(stripHtml(data?.content)),
          });
        }
      }

      /** Degree programs via collectionGroup (fast, no per-dept loops) */
      for (const p of progGroupSnap.docs) {
        const pdata: any = p.data();
        // parent path: departments/{deptId}/degreePrograms/{progId}
        const deptId = p.ref.parent.parent?.id;
        if (!deptId) continue;

        const hay =
          `${stripHtml(pdata?.content)} ${pdata?.title || ""} ${pdata?.name || ""}`.toLowerCase();
        if (hay.includes(needle)) {
          bucket.push({
            title: pdata?.title || pdata?.name || "Degree Program",
            url: `/academics/degree-programs/${deptId}/${p.id}`,
            tag: "Degree Program",
            snippet: truncate(stripHtml(pdata?.content)),
          });
        }
      }

      /** News */
      for (const d of newsSnap.docs) {
        const data: any = d.data();
        const hay = `${data?.title} ${stripHtml(data?.content)}`.toLowerCase();
        if (hay.includes(needle)) {
          const date = tsToDate(data?.createdAt);
          bucket.push({
            title: data?.title || "News",
            url: `/news/${d.id}`,
            tag: "News",
            snippet: truncate(stripHtml(data?.content)),
            date,
            displayDate: fmtDate(date),
          });
        }
      }

      /** Events */
      for (const d of eventsSnap.docs) {
        const data: any = d.data();
        const hay = `${data?.title} ${stripHtml(data?.content)}`.toLowerCase();
        if (hay.includes(needle)) {
          const date = tsToDate(data?.date);
          bucket.push({
            title: data?.title || "Event",
            url: `/events/${d.id}`,
            tag: "Event",
            snippet: truncate(stripHtml(data?.content)),
            date,
            displayDate: fmtDate(date),
          });
        }
      }

      /** Researches */
      for (const d of researchSnap.docs) {
        const data: any = d.data();
        const hay = `${data?.title} ${stripHtml(data?.content)}`.toLowerCase();
        if (hay.includes(needle)) {
          bucket.push({
            title: data?.title || "Research",
            url: `/research/${d.id}`,
            tag: "Research",
            snippet: truncate(stripHtml(data?.content)),
          });
        }
      }

      /** Downloads (single card to /download) */
      {
        let pushed = false;
        for (const d of downloadsSnap.docs) {
          const data: any = d.data();
          const hay =
            `${data?.title || ""} ${stripHtml(data?.content) || ""} ${data?.author || ""}`.toLowerCase();
          if (hay.includes(needle) && !pushed) {
            bucket.push({
              title: data?.title || "College Downloads",
              url: "/download",
              tag: "Downloads",
              snippet: truncate(stripHtml(data?.content)),
            });
            pushed = true;
          }
        }
      }

      /** OBE */
      if (obeDoc.exists()) {
        const data: any = obeDoc.data();
        const hay = `${stripHtml(data?.content)}`.toLowerCase();
        if (hay.includes(needle)) {
          bucket.push({
            title: "Outcomes-Based Education",
            url: "/obe",
            tag: "OBE",
            snippet: truncate(stripHtml(data?.content)),
          });
        }
      }

      /** Sort by date (news/events first by recency), then title */
      bucket.sort((a, b) => {
        const at = a.date ? +a.date : 0;
        const bt = b.date ? +b.date : 0;
        if (bt !== at) return bt - at;
        return a.title.localeCompare(b.title);
      });

      /** Assign to UI */
      allResults.value = bucket;
    } finally {
      loading.value = false; // always hide overlay
    }
  });
</script>

<style scoped>
  .text-maroon {
    color: #740505;
  }
</style>
