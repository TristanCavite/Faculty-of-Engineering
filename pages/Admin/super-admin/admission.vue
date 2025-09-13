<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage Admission Page</h1>
    </div>

    <!-- Section Selector -->
    <div>
      <label class="mb-1 block font-semibold">Select Section</label>
      <select v-model="selectedSection" class="select select-bordered w-full">
        <option disabled value="">-- Choose section --</option>
        <option value="why_choose_vsu">Why Choose VSU?</option>
        <option value="undergraduate">Undergraduate</option>
        <option value="graduate">Graduate</option>
      </select>
    </div>

    <!-- Undergrad public visibility (only shows for 'undergraduate') -->
    <div v-if="selectedSection === 'undergraduate'" class="rounded-lg border bg-white p-4 shadow">
      <div class="flex items-start justify-between gap-6">
        <div>
          <h3 class="font-semibold">Show Undergraduate on public</h3>
          <p class="text-sm text-gray-600">
            When unchecked, the Undergraduate page is hidden from the public navbar and direct links
            will return 404.
          </p>
        </div>

        <!-- Simple checkbox; change commits immediately -->
        <label class="flex select-none items-center gap-3">
          <input
            type="checkbox"
            v-model="showUndergradPublic"
            class="h-5 w-5 cursor-pointer accent-green-600"
            @change="saveUndergradVisibility"
          />
          <span class="text-sm font-medium">{{ showUndergradPublic ? "Visible" : "Hidden" }}</span>
        </label>
      </div>

      <p v-if="visSavedAt" class="mt-2 text-xs text-gray-500">Updated: {{ visSavedAt }}</p>
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
          alt="Admission cover"
        />
        <p v-if="pendingCoverPreview" class="mt-1 text-xs text-amber-600">
          This image is not saved yet — it will be uploaded when you click <b>Save Changes</b>.
        </p>
      </div>

      <!-- Promotional Video (only for 'Why Choose VSU?') -->
      <div v-if="selectedSection === 'why_choose_vsu'">
        <label class="mb-1 block font-semibold">Promotional Video (YouTube/Vimeo)</label>
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

      <!-- Content -->
      <div>
        <label class="mb-2 block font-semibold">Content</label>

        <!-- Edit / Cancel toggle -->
        <UiButton class="bg-maroon text-white hover:opacity-90" @click="toggleEdit">
          {{ isEditing ? "Cancel" : "Edit Content" }}
        </UiButton>

        <!-- PREVIEW (identical wrapper to public pages) -->
        <div
          v-if="!isEditing"
          class="cet-content prose max-w-none rounded border bg-white p-4 shadow"
          v-html="form.content"
        />

        <!-- EDITOR (same wrapper so Edit looks exactly like Preview) -->
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
   * Manage Admission Page (Super Admin)
   * - Adds a checkbox for "Show Undergraduate on public"
   * - Toggling writes BOTH:
   *    settings/public_flags.admissionUndergradVisible
   *    admission_sections/undergraduate.isVisible
   * - Content editor behavior unchanged.
   */
  import UiTiptapEditor from "@/components/UiTiptapEditor.vue";
  import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
  import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
  import { computed, ref, watch } from "vue";
  import { useFirebaseStorage, useFirestore } from "vuefire";

  definePageMeta({ middleware: "auth", layout: "super-admin" });

  const db = useFirestore();
  const storage = useFirebaseStorage();

  /** UI state */
  const isEditing = ref(false);
  const selectedSection = ref("");

  /** Undergrad visibility toggle state */
  const showUndergradPublic = ref(true);
  const visSavedAt = ref<string | "">("");

  /** Form model */
  const form = ref({
    coverImageUrl: "",
    content: "",
    videoUrl: "",
  });

  const coverInput = ref<HTMLInputElement | null>(null);

  /** Pending (unsaved) cover image */
  const pendingCoverFile = ref<File | null>(null);
  /** Local preview URL for the pending cover image */
  const pendingCoverPreview = ref<string | "">("");

  /** Baseline snapshot (for 'No changes' detection) */
  const baseline = ref({ coverImageUrl: "", content: "", videoUrl: "" });

  /** Helper: load the current undergrad visibility from either flags or section doc */
  async function loadUndergradVisibility() {
    try {
      const flagsSnap = await getDoc(doc(db, "settings", "public_flags"));
      const ugSnap = await getDoc(doc(db, "admission_sections", "undergraduate"));
      const flagVal = flagsSnap.exists()
        ? (flagsSnap.data() as any).admissionUndergradVisible
        : undefined;
      const sectionVal = ugSnap.exists() ? (ugSnap.data() as any).isVisible : undefined;

      showUndergradPublic.value = flagVal ?? sectionVal ?? true; // default visible if nothing set
    } catch (e) {
      console.error(e);
      showUndergradPublic.value = true;
    }
  }

  /** Load a section and reset the baseline */
  watch(selectedSection, async (id) => {
    if (!id) return;

    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
    pendingCoverFile.value = null;
    pendingCoverPreview.value = "";
    if (coverInput.value) coverInput.value.value = "";

    // Load section content
    const snap = await getDoc(doc(db, "admission_sections", id));
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
    baseline.value = { ...form.value };
    isEditing.value = false;

    // When editing Undergraduate, also load the visibility flag
    if (id === "undergraduate") {
      await loadUndergradVisibility();
    }
  });

  /** Dirty checker mirrors Manage About */
  const isDirty = computed(
    () =>
      // New unsaved cover image OR other field changes
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

  /** TipTap image uploader (returns URL to insert) */
  async function handleEditorImageUpload(file: File) {
    const path = `editor_images/${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage, path);
    const snap = await uploadBytes(fileRef, file);
    return await getDownloadURL(snap.ref);
  }

  /** Save content changes to Firestore; update baseline; exit edit mode */
  /** Save content changes to Firestore; upload pending cover if any; update baseline; exit edit mode */
  async function saveSection() {
    if (!selectedSection.value || !isDirty.value) return;

    // 1) If there is a new cover image pending, upload it now
    if (pendingCoverFile.value) {
      const path = `admission_sections/${selectedSection.value}/cover.jpg`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, pendingCoverFile.value);
      form.value.coverImageUrl = await getDownloadURL(fileRef);
    }

    // 2) Build doc payload
    const payload: Record<string, any> = {
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
    };
    if (selectedSection.value === "why_choose_vsu") {
      payload.videoUrl = form.value.videoUrl;
    }

    // 3) Persist
    await setDoc(doc(db, "admission_sections", selectedSection.value), payload);

    // 4) Cleanup pending + reset baseline + exit edit mode
    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
    pendingCoverFile.value = null;
    pendingCoverPreview.value = "";
    if (coverInput.value) coverInput.value.value = "";

    baseline.value = { ...form.value };
    isEditing.value = false;
    alert("Section updated!");
  }

  /** Convert YT URLs to embed form; passthrough others (e.g., Vimeo embed) */
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
      return url;
    } catch {
      return "";
    }
  });

  /** Toggle edit mode with snapshot-safe cancel */
  function toggleEdit() {
    if (isEditing.value) {
      // Cancel → revert fields
      form.value = { ...baseline.value };

      // Also discard any unsaved cover image
      if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
      pendingCoverFile.value = null;
      pendingCoverPreview.value = "";
      if (coverInput.value) coverInput.value.value = "";

      isEditing.value = false;
    } else {
      isEditing.value = true;
    }
  }

  /** Commit the "Show Undergraduate on public" checkbox (atomic batch) */
  async function saveUndergradVisibility() {
    try {
      const batch = writeBatch(db);

      // Update public flags doc (readable by everyone)
      batch.set(
        doc(db, "settings", "public_flags"),
        {
          admissionUndergradVisible: showUndergradPublic.value,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Mirror to the section doc so security rules can use it
      batch.set(
        doc(db, "admission_sections", "undergraduate"),
        {
          isVisible: showUndergradPublic.value,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();
      visSavedAt.value = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      alert("Failed to update visibility. Please try again.");
    }
  }
</script>

<style>
  /* Brand helper */
  .bg-maroon {
    background-color: #740505;
  }
</style>
