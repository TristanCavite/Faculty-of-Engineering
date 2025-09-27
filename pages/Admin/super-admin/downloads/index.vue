<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage Downloads</h1>
      <UiButton
        class="bg-maroon text-white hover:opacity-90"
        @click="$router.push('/admin/super-admin/downloads/add_download')"
      >
        + Add Download
      </UiButton>
    </div>

    <!-- Downloads list -->
    <div v-if="downloads.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="item in downloads"
        :key="item.id"
        class="relative space-y-2 rounded border bg-white p-4 pt-8 shadow transition hover:shadow-md"
      >
        <!-- ❌ Delete Icon (same style as News) -->
        <button
          class="absolute -right-2 -top-2 z-10 rounded-full bg-white/90 p-1 text-gray-500 shadow hover:text-red-600"
          @click="confirmDelete(item)"
          aria-label="Delete download"
        >
          <X class="h-4 w-4" />
        </button>

        <!-- Title -->
        <h2 class="text-xl font-bold text-maroon">{{ item.title }}</h2>

        <!-- Author & Date -->
        <div class="text-sm text-gray-500">
          <span>By {{ item.author || "Unknown" }}</span> |
          <span>{{ formatDate(item.createdAt) }}</span>
        </div>

        <!-- Preview (plain text from rich HTML) -->
        <p class="text-sm text-gray-700">
          {{ previewText(item.content) }}
        </p>

        <UiButton
          variant="outline"
          class="border-maroon text-maroon hover:!border-maroon hover:bg-maroon hover:!text-white"
          @click="readMore(item.id)"
        >
          Read more...
        </UiButton>
      </div>
    </div>

    <!-- Placeholder -->
    <div v-else class="mt-10 rounded border p-10 text-center text-gray-500">
      No downloads yet. Click “+ Add Download” to create your first entry.
    </div>

    <!-- 🧾 Delete Confirmation Modal (exactly like News) -->
    <UiModal v-if="showDeleteModal" @close="showDeleteModal = false">
      <template #header>Delete Download</template>

      <template #default>
        Are you sure you want to delete
        <span class="font-semibold text-maroon">{{ selectedDownload?.title }}</span
        >?
      </template>

      <template #footer>
        <UiButton class="bg-gray-200" @click="showDeleteModal = false">Cancel</UiButton>
        <UiButton class="bg-red-600 text-white" @click="deleteDownload">Delete</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
  // Firestore + Vue
  import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    QueryDocumentSnapshot,
    Timestamp,
  } from "firebase/firestore";
  import { X } from "lucide-vue-next";
  import { onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import { useFirestore } from "vuefire";
  import type { DocumentData } from "firebase/firestore";

  definePageMeta({ layout: "super-admin", middleware: "auth" });

  const db = useFirestore();
  const router = useRouter();

  // State
  const downloads = ref<any[]>([]);
  const selectedDownload = ref<any>(null);
  const showDeleteModal = ref(false);

  // Load downloads (newest first)
  onMounted(async () => {
    const q = query(collection(db, "downloads"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    downloads.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      id: d.id,
      ...d.data(),
    }));
  });

  function readMore(id: string) {
    // mirrors your News route style
    router.push(`/Admin/super-admin/downloads/${id}`);
  }

  function formatDate(ts: Timestamp | null) {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Strip tags/entities so no &nbsp; mess
  function previewText(html = "") {
    let txt = html.replace(/<[^>]*>/g, " ");
    txt = txt
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");
    txt = txt.replace(/\s+/g, " ").trim();
    return txt.length > 220 ? txt.slice(0, 220) + "…" : txt;
  }

  function confirmDelete(item: any) {
    selectedDownload.value = item;
    showDeleteModal.value = true;
  }

  async function deleteDownload() {
    if (!selectedDownload.value) return;
    await deleteDoc(doc(db, "downloads", selectedDownload.value.id));
    downloads.value = downloads.value.filter((d) => d.id !== selectedDownload.value.id);
    selectedDownload.value = null;
    showDeleteModal.value = false;
  }
</script>

<style scoped>
  .bg-maroon {
    background-color: #740505;
  }
  .text-maroon {
    color: #740505;
  }
  .border-maroon {
    border-color: #740505;
  }
</style>
