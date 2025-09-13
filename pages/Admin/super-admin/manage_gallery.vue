<template>
  <div class="mx-auto max-w-7xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage Gallery</h1>

      <div class="flex items-center gap-2">
        <UiButton
          class="border border-maroon bg-white text-maroon hover:bg-maroon hover:!text-white hover:[&_*]:!text-white"
          :disabled="busy"
          @click="pickFiles"
        >
          + Add images
        </UiButton>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handleAdd"
        />
      </div>
    </div>

    <!-- Subnote -->
    <p class="text-sm text-gray-500">
      Tip: Use wide images (e.g., 1920×800). Only what you upload here will appear on the homepage
      carousel.
    </p>

    <!-- Grid -->
    <div v-if="items.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="it in items"
        :key="it.id"
        class="relative overflow-hidden rounded-lg border bg-white"
      >
        <img
          :src="it.imageUrl"
          class="h-56 w-full object-cover"
          alt="Gallery item"
          loading="lazy"
        />
        <!-- Delete Icon -->
        <!-- Delete Icon (white chip, subtle hover) -->
        <button
          class="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-maroon shadow-md ring-1 ring-maroon/30 backdrop-blur transition hover:scale-105 hover:text-red-600 hover:shadow-lg hover:ring-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
          :class="{ 'cursor-not-allowed opacity-50': busyIds.has(it.id) }"
          :disabled="busyIds.has(it.id)"
          @click="confirmDelete(it)"
          aria-label="Delete image"
          title="Delete"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-else class="rounded border bg-white p-10 text-center text-gray-500">
      No images yet. Click “+ Add images” to upload.
    </div>

    <!-- Delete modal -->
    <UiModal v-if="showDelete" @close="showDelete = false">
      <template #header>Delete image</template>
      <template #default>
        Are you sure you want to delete this image? This can’t be undone.
      </template>
      <template #footer>
        <UiButton class="bg-gray-200" @click="showDelete = false">Cancel</UiButton>
        <UiButton class="bg-red-600 text-white" :disabled="busy" @click="doDelete">Delete</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
  import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
  } from "firebase/firestore";
  import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
  import { X } from "lucide-vue-next";
  import { onMounted, ref } from "vue";
  import { useFirebaseStorage, useFirestore } from "vuefire";
  import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

  definePageMeta({ layout: "super-admin", middleware: "auth" });

  type Item = {
    id: string;
    imageUrl: string;
    storagePath: string; // keep the exact storage path for easy deletes
    createdAt?: any;
  };

  const db = useFirestore();
  const storage = useFirebaseStorage();

  const items = ref<Item[]>([]);
  const fileInput = ref<HTMLInputElement | null>(null);
  const busy = ref(false);
  const busyIds = ref<Set<string>>(new Set());

  const showDelete = ref(false);
  const toDelete = ref<Item | null>(null);

  onMounted(load);

  async function load() {
    const q = query(collection(db, "homepage_gallery"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    items.value = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
      const data = d.data() as any;
      return {
        id: d.id,
        imageUrl: data.imageUrl || "",
        storagePath: data.storagePath || `homepage_gallery/${d.id}.jpg`,
        createdAt: data.createdAt,
      };
    });
  }

  function pickFiles() {
    fileInput.value?.click();
  }

  async function handleAdd(e: Event) {
    const files = (e.target as HTMLInputElement)?.files;
    if (!files || !files.length) return;

    busy.value = true;
    try {
      for (const file of Array.from(files)) {
        // 1) create doc to get an id
        const refDoc = await addDoc(collection(db, "homepage_gallery"), {
          imageUrl: "",
          storagePath: "",
          createdAt: serverTimestamp(),
        });

        // 2) upload to a deterministic path using the new id
        const path = `homepage_gallery/${refDoc.id}-${file.name}`;
        const sref = storageRef(storage, path);
        const up = await uploadBytes(sref, file);
        const url = await getDownloadURL(up.ref);

        // 3) update doc with url + path
        await addDocOrUpdate(refDoc.id, { imageUrl: url, storagePath: path });

        // 4) update UI
        items.value.unshift({
          id: refDoc.id,
          imageUrl: url,
          storagePath: path,
        });
      }
    } catch (err) {
      console.error("Add images failed:", err);
      alert("Failed to upload one or more images.");
    } finally {
      busy.value = false;
      if (fileInput.value) fileInput.value.value = "";
    }
  }

  async function addDocOrUpdate(id: string, data: Partial<Item>) {
    // tiny helper so we don’t import updateDoc—addDoc already done above
    const c = collection(db, "homepage_gallery");
    await (await import("firebase/firestore")).updateDoc(doc(c, id), data as any);
  }

  function confirmDelete(it: Item) {
    toDelete.value = it;
    showDelete.value = true;
  }

  async function doDelete() {
    if (!toDelete.value) return;
    const it = toDelete.value;
    busy.value = true;
    busyIds.value.add(it.id);

    try {
      // delete file first (ignore if already gone)
      if (it.storagePath) {
        const sref = storageRef(storage, it.storagePath);
        await deleteObject(sref).catch(() => {});
      }
      // then delete doc
      await deleteDoc(doc(db, "homepage_gallery", it.id));
      // update UI
      items.value = items.value.filter((x) => x.id !== it.id);
      showDelete.value = false;
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Could not delete image.");
    } finally {
      busy.value = false;
      busyIds.value.delete(it.id);
      toDelete.value = null;
    }
  }
</script>

<style scoped>
  .text-maroon {
    color: #740505;
  }
  .bg-maroon {
    background-color: #740505;
  }
  .border-maroon {
    border-color: #740505;
  }
</style>
