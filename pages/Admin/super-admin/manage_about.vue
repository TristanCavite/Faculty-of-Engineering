<!-- pages/admin/manage_about.vue -->
<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage About Page</h1>
    </div>

    <!-- Section Selector -->
    <div>
      <label class="mb-1 block font-semibold">Select Section</label>
      <select v-model="selectedSection" class="select select-bordered w-full">
        <option disabled value="">-- Choose section --</option>
        <option value="the_college">The College</option>
        <option value="facilities">Facilities</option>
        <option value="history">History</option>
        <option value="map_location">Map and Location</option>
      </select>
    </div>

    <!-- Form Section -->
    <div v-if="selectedSection" class="grid gap-6">
      <!-- Cover Image -->
      <div>
        <label class="mb-1 block font-semibold">Cover Image</label>
        <input
          ref="coverInput"
          type="file"
          class="file-input file-input-bordered w-full"
          accept="image/*"
          @change="handleImage"
        />

        <img
          v-if="pendingCoverPreview || form.coverImageUrl"
          :src="pendingCoverPreview || form.coverImageUrl"
          class="mt-2 h-48 w-full rounded object-cover"
          alt="About cover"
        />
        <p v-if="pendingCoverPreview" class="mt-1 text-xs text-amber-600">
          This image is not saved yet — it will be uploaded when you click <b>Save Changes</b>.
        </p>
      </div>

      <!-- College Promo Video (only for The College section) -->
      <div v-if="selectedSection === 'the_college'">
        <label class="mb-1 block font-semibold">College Promotional Video (YouTube/Vimeo)</label>
        <input
          v-model="form.videoUrl"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          class="input input-bordered w-full"
        />
        <div v-if="form.videoUrl" class="mt-4 aspect-video w-full">
          <iframe
            :src="embedVideoUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="h-full w-full rounded"
          ></iframe>
        </div>
      </div>

      <!-- Content Section -->
      <div>
        <label class="mb-2 block font-semibold">Content</label>

        <!-- Edit / Cancel toggle -->
        <UiButton class="bg-maroon text-white hover:opacity-90" @click="toggleEdit">
          {{ isEditing ? "Cancel" : "Edit Content" }}
        </UiButton>

        <!-- PREVIEW: uses same wrapper/classes as public pages -->
        <div
          v-if="!isEditing"
          class="cet-content prose max-w-none rounded border bg-white p-4 shadow"
          v-html="form.content"
        />

        <!-- EDITOR: wrapped the SAME so typography/colors match preview/public -->
        <div v-else class="cet-content prose max-w-none rounded border bg-white p-4 shadow">
          <UiTiptapEditor
            v-model="form.content"
            :editing="isEditing"
            @image-upload="handleEditorImageUpload"
          />
        </div>

        <!-- Save -->
        <div class="mt-4 flex items-center justify-end gap-3">
          <span v-if="!isDirty" class="text-sm text-gray-400">No changes</span>
          <UiButton
            class="bg-maroon text-white hover:opacity-90 disabled:opacity-50"
            :disabled="!isDirty"
            @click="saveSection"
          >
            Save Changes
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  /**
   * Manage About Page (Admin)
   * - Preview & editor are wrapped in `.cet-content prose` so both render with the
   *   same typography rules defined in assets/css/tiptap.css (mobile caps, colors, etc).
   * - Save button is disabled until content actually differs from what was loaded/saved.
   */
  import UiTiptapEditor from "@/components/UiTiptapEditor.vue";
  import { doc, getDoc, setDoc } from "firebase/firestore";
  import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
  import { computed, ref, watch } from "vue";
  import { useFirebaseStorage, useFirestore } from "vuefire";

  definePageMeta({ middleware: "auth", layout: "super-admin" });

  const db = useFirestore();
  const storage = useFirebaseStorage();

  /** UI state */
  const isEditing = ref(false);
  const selectedSection = ref("");

  /** Form model */
  const form = ref({
    coverImageUrl: "",
    content: "",
    videoUrl: "",
  });

  const coverInput = ref<HTMLInputElement | null>(null);
  const pendingCoverFile = ref<File | null>(null);
  const pendingCoverPreview = ref<string | "">("");

  /** Baseline snapshot of last loaded/saved values (for dirty check) */
  const baseline = ref({ coverImageUrl: "", content: "", videoUrl: "" });

  /** Load section when changed */
  watch(selectedSection, async (id) => {
    if (!id) return;
    // Discard any unsaved cover selection when switching sections
    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
    pendingCoverFile.value = null;
    pendingCoverPreview.value = "";
    if (coverInput.value) coverInput.value.value = "";

    const snap = await getDoc(doc(db, "about_sections", id));
    if (snap.exists()) {
      const data = snap.data() as any;
      form.value.coverImageUrl = data.coverImageUrl || "";
      form.value.content = data.content || "";
      form.value.videoUrl = data.videoUrl || "";
    } else {
      form.value.coverImageUrl = "";
      form.value.content = "";
      form.value.videoUrl = "";
    }
    // Reset baseline and exit edit mode so preview shows what we loaded
    baseline.value = { ...form.value };
    isEditing.value = false;
  });

  /** Whether anything changed vs. baseline (controls Save button) */
  const isDirty = computed(
    () =>
      !!pendingCoverFile.value ||
      form.value.coverImageUrl !== baseline.value.coverImageUrl ||
      form.value.content !== baseline.value.content ||
      form.value.videoUrl !== baseline.value.videoUrl
  );

  /** Pick cover image locally (no upload yet). Shows a preview and marks form dirty. */
  function handleImage(e: Event) {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    // Clean up previous preview to avoid leaks
    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);

    pendingCoverFile.value = file;
    pendingCoverPreview.value = URL.createObjectURL(file);
  }

  /** TipTap image uploader (returns a URL to insert) */
  async function handleEditorImageUpload(file: File) {
    const path = `editor_images/${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage, path);
    const snap = await uploadBytes(fileRef, file);
    return await getDownloadURL(snap.ref);
  }

  /** Save changes to Firestore */
  /** Save changes to Firestore (uploads pending cover first) */
  async function saveSection() {
    if (!selectedSection.value || !isDirty.value) return;

    // Upload pending cover if present
    if (pendingCoverFile.value) {
      const path = `about_sections/${selectedSection.value}/cover.jpg`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, pendingCoverFile.value);
      form.value.coverImageUrl = await getDownloadURL(fileRef);
    }

    const payload: Record<string, any> = {
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
    };
    if (selectedSection.value === "the_college") {
      payload.videoUrl = form.value.videoUrl;
    }

    await setDoc(doc(db, "about_sections", selectedSection.value), payload);

    // Cleanup pending + update baseline + exit edit mode
    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
    pendingCoverFile.value = null;
    pendingCoverPreview.value = "";
    if (coverInput.value) coverInput.value.value = "";

    baseline.value = { ...form.value };
    isEditing.value = false;
    alert("Section updated!");
  }

  /** Compute embed URL for YouTube/Vimeo (supports youtu.be & youtube.com/watch) */
  const embedVideoUrl = computed(() => {
    const url = (form.value.videoUrl || "").trim();
    if (!url) return "";
    try {
      if (url.includes("youtu.be")) {
        const id = url.split("/").pop()?.split("?")[0];
        return id ? `https://www.youtube.com/embed/${id}` : "";
      }
      if (url.includes("youtube.com/watch")) {
        const id = new URL(url).searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : "";
      }
      return url; // already an embed or a vimeo embed link
    } catch {
      return "";
    }
  });

  /** Toggle edit mode. Cancel returns to the baseline content. */
  function toggleEdit() {
    if (isEditing.value) {
      // Cancel → revert any unsaved edits
      form.value = { ...baseline.value };

      // Discard pending cover
      if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
      pendingCoverFile.value = null;
      pendingCoverPreview.value = "";
      if (coverInput.value) coverInput.value.value = "";

      isEditing.value = false;
    } else {
      isEditing.value = true;
    }
  }
</script>

<style>
  /* Brand helper */
  .bg-maroon {
    background-color: #740505;
  }

  /* Editor chrome (the actual typography is inherited from .cet-content/.prose) */
  .ProseMirror {
    outline: none !important;
  }
  .EditorContent {
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
    min-height: 300px;
    background-color: #ffffff;
  }
  .resizable-image {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0.5rem 0;
  }
  /* Ensure inline styled spans layout nicely if any legacy content remains */
  .EditorContent span[style*="font-size"],
  .EditorContent span[style*="color"] {
    display: inline-block;
  }
</style>
