<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage About Page</h1>
    </div>

    <!-- Section Selector -->
    <div>
      <label class="mb-1 block font-semibold">Select Section</label>

      <!-- Keep original static options first -->
      <select v-model="selectedSection" class="select select-bordered w-full">
        <option disabled value="">-- Choose section --</option>
        <option value="the_college">The College</option>
        <option value="facilities">Facilities</option>
        <option value="history">History</option>
        <option value="map_location">Map and Location</option>

        <!-- Append extras: show saved title or default label "Extra Section" -->
        <option
          v-for="s in extraSections"
          :key="s.id"
          :value="s.id"
        >
          {{ (s.title && s.title.trim()) ? s.title : 'Extra Section' }}
        </option>
      </select>
    </div>

    <!-- Form Section -->
    <div v-if="selectedSection" class="grid gap-6">
      <!-- Visibility toggle for extras: only for extra_section_1 & extra_section_2 -->
      <div
        v-if="isExtraSection"
        class="rounded-lg border bg-white p-4 shadow"
      >
        <div class="flex items-start justify-between gap-6">
          <div>
            <h3 class="font-semibold">Show on public</h3>
            <p class="text-sm text-gray-600">
              When unchecked, this section is hidden from the public navbar and direct links will return 404 / not be displayed.
            </p>
          </div>

          <!-- Checkbox bound to `showSectionPublic` and commits immediately -->
          <label class="flex select-none items-center gap-3">
            <input
              type="checkbox"
              v-model="showSectionPublic"
              class="h-5 w-5 cursor-pointer accent-green-600"
              @change="saveAboutVisibility"
            />
            <span class="text-sm font-medium">{{ showSectionPublic ? 'Visible' : 'Hidden' }}</span>
          </label>
        </div>

        <p v-if="visSavedAt" class="mt-2 text-xs text-gray-500">
          Updated: {{ visSavedAt }}
        </p>
      </div>

      <!-- Title / Name - only show for extra sections -->
      <div v-if="isExtraSection">
        <label class="mb-1 block font-semibold">Name / Title Section</label>
        <div class="flex gap-3">
          <input
            v-model="form.title"
            type="text"
            placeholder="Enter the section title (leave empty => 'Extra Section')"
            class="input input-bordered flex-1"
          />
          <UiButton
            class="bg-maroon text-white"
            :disabled="!selectedSection"
            @click="saveTitle"
          >
            Save Title
          </UiButton>
        </div>
      </div>

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

        <!-- PREVIEW -->
        <div
          v-if="!isEditing"
          class="cet-content prose max-w-none rounded border bg-white p-4 shadow"
          v-html="form.content"
        />

        <!-- EDITOR -->
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
 * Manage About Page - updated with:
 * - Title input only for extra_section_1 & extra_section_2
 * - Visibility toggle for extra sections (writes settings/public_flags + about_sections.{id}.isVisible)
 * - Dropdown shows "Extra Section" for unnamed extras
 * - Save uses merge so static sections don't gain a title field
 *
 * Inline comments explain each area.
 */

import UiTiptapEditor from "@/components/UiTiptapEditor.vue";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

import { computed, ref, watch, onMounted } from "vue";
import { useFirebaseStorage, useFirestore } from "vuefire";

definePageMeta({ middleware: "auth", layout: "super-admin" });

const db = useFirestore();
const storage = useFirebaseStorage();

/* -------------------- UI state & models -------------------- */
const isEditing = ref(false);
const selectedSection = ref("");

// form includes title field but we only show it for extras
const form = ref({
  title: "",
  coverImageUrl: "",
  content: "",
  videoUrl: ""
});

const coverInput = ref<HTMLInputElement | null>(null);
const pendingCoverFile = ref<File | null>(null);
const pendingCoverPreview = ref<string | "">("");

// baseline snapshot (for dirty detection)
const baseline = ref({ title: "", coverImageUrl: "", content: "", videoUrl: "" });

// extras list used to append to dropdown after static items
const extraSections = ref<Array<{ id: string; title?: string; order?: number }>>([]);

/* -------------------- Extra visibility state -------------------- */
// Visibility checkbox state for currently edited extra section
const showSectionPublic = ref(true);
// Human-readable last-saved timestamp for the visibility change
const visSavedAt = ref<string | "">("");

// Helper: whether the currently selected section is one of the extras
const isExtraSection = computed(() => {
  return selectedSection.value === "extra_section_1" || selectedSection.value === "extra_section_2";
});

/* -------------------- Ensure docs exist -------------------- */
async function ensureDocsExist() {
  try {
    const extras = ["extra_section_1", "extra_section_2"];
    const required = ["the_college", "facilities", "history", "map_location", ...extras];

    for (const id of required) {
      const snap = await getDoc(doc(db, "about_sections", id));
      if (!snap.exists()) {
        await setDoc(doc(db, "about_sections", id), {
          title: "", // extras will use title; static sections will ignore title in UI
          coverImageUrl: "",
          content: "",
          videoUrl: "",
          order: required.indexOf(id),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (err) {
    console.error("ensureDocsExist error", err);
  }
}

/* -------------------- Subscribe to about_sections to show extras -------------------- */
function subscribeExtras() {
  const colRef = collection(db, "about_sections");
  onSnapshot(colRef, (snap) => {
    const arr: any[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      arr.push({ id: d.id, title: data.title || "", order: data.order ?? 999 });
    });

    arr.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    // filter to keep only extras so they can be appended after static entries
    extraSections.value = arr.filter((x) => x.id === "extra_section_1" || x.id === "extra_section_2");
  }, (err) => {
    console.error("subscribeExtras error", err);
  });
}

onMounted(async () => {
  await ensureDocsExist();
  subscribeExtras();
});

/* -------------------- Load section when changed -------------------- */
watch(selectedSection, async (id) => {
  if (!id) return;

  // discard any unsaved cover preview
  if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
  pendingCoverFile.value = null;
  pendingCoverPreview.value = "";
  if (coverInput.value) coverInput.value.value = "";

  try {
    const snap = await getDoc(doc(db, "about_sections", id));
    if (snap.exists()) {
      const data = snap.data() as any;
      form.value.title = data.title || "";
      form.value.coverImageUrl = data.coverImageUrl || "";
      form.value.content = data.content || "";
      form.value.videoUrl = data.videoUrl || "";
    } else {
      form.value.title = "";
      form.value.coverImageUrl = "";
      form.value.content = "";
      form.value.videoUrl = "";
    }

    baseline.value = {
      title: form.value.title,
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
      videoUrl: form.value.videoUrl
    };
    isEditing.value = false;

    // If editing an extra section, load its visibility flag
    if (id === "extra_section_1" || id === "extra_section_2") {
      await loadAboutVisibility(id);
    } else {
      // reset visibility UI when not editing extras
      showSectionPublic.value = true;
      visSavedAt.value = "";
    }
  } catch (err) {
    console.error("Error loading section", err);
  }
}, { immediate: true });

/* -------------------- Dirty check -------------------- */
const isDirty = computed(() =>
  !!pendingCoverFile.value ||
  (form.value.title || "") !== (baseline.value.title || "") ||
  form.value.coverImageUrl !== baseline.value.coverImageUrl ||
  form.value.content !== baseline.value.content ||
  form.value.videoUrl !== baseline.value.videoUrl
);

/* -------------------- Image preview -------------------- */
function handleImage(e: Event) {
  const file = (e.target as HTMLInputElement)?.files?.[0];
  if (!file) return;
  if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
  pendingCoverFile.value = file;
  pendingCoverPreview.value = URL.createObjectURL(file);
}

/* -------------------- TipTap image uploader -------------------- */
async function handleEditorImageUpload(file: File) {
  const path = `editor_images/${Date.now()}-${file.name}`;
  const fileRef = storageRef(storage, path);
  const snap = await uploadBytes(fileRef, file);
  return await getDownloadURL(snap.ref);
}

/* -------------------- Save title quick action -------------------- */
async function saveTitle() {
  if (!selectedSection.value) return;
  try {
    // update title field; realtime listener updates dropdown label
    await updateDoc(doc(db, "about_sections", selectedSection.value), {
      title: form.value.title || "",
      updatedAt: serverTimestamp()
    });
    baseline.value.title = form.value.title || "";
  } catch (err) {
    console.error("saveTitle error", err);
    alert("Failed to save title");
  }
}

/* -------------------- Save section (uploads pending cover if any) -------------------- */
async function saveSection() {
  if (!selectedSection.value || !isDirty.value) return;

  try {
    if (pendingCoverFile.value) {
      const path = `about_sections/${selectedSection.value}/cover_${Date.now()}.jpg`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, pendingCoverFile.value);
      form.value.coverImageUrl = await getDownloadURL(fileRef);
    }

    // Build payload. Only include title for extras: for static sections we won't set title here.
    const payload: Record<string, any> = {
      coverImageUrl: form.value.coverImageUrl || "",
      content: form.value.content || "",
      updatedAt: serverTimestamp()
    };

    if (isExtraSection.value) {
      payload.title = form.value.title || "";
    }

    if (selectedSection.value === "the_college") {
      payload.videoUrl = form.value.videoUrl || "";
    }

    // Use merge so we don't accidentally wipe unrelated fields
    await setDoc(doc(db, "about_sections", selectedSection.value), payload, { merge: true });

    // cleanup + baseline update
    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
    pendingCoverFile.value = null;
    pendingCoverPreview.value = "";
    if (coverInput.value) coverInput.value.value = "";

    baseline.value = {
      title: form.value.title,
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
      videoUrl: form.value.videoUrl
    };

    isEditing.value = false;
    alert("Section updated!");
  } catch (err) {
    console.error("saveSection error", err);
    alert("Failed to save section");
  }
}

/* -------------------- Visibility helpers -------------------- */

/**
 * loadAboutVisibility(sectionId)
 * - Reads settings/public_flags and about_sections/{sectionId}.isVisible
 * - Prefers flags doc value first (global override), else section doc, else defaults true
 */
async function loadAboutVisibility(sectionId: string) {
  try {
    const flagsSnap = await getDoc(doc(db, "settings", "public_flags"));
    const secSnap = await getDoc(doc(db, "about_sections", sectionId));

    const flagKey = `about_${sectionId}`; // e.g., about_extra_section_1
    const flagVal = flagsSnap.exists() ? (flagsSnap.data() as any)[flagKey] : undefined;
    const sectionVal = secSnap.exists() ? (secSnap.data() as any).isVisible : undefined;

    showSectionPublic.value = flagVal ?? sectionVal ?? true;
  } catch (err) {
    console.error("loadAboutVisibility error", err);
    showSectionPublic.value = true;
  }
}

/**
 * saveAboutVisibility()
 * - Writes atomically (writeBatch):
 *   - settings/public_flags.{about_<id>} = boolean
 *   - about_sections/{id}.isVisible = boolean (mirror)
 */
async function saveAboutVisibility() {
  if (!selectedSection.value) return;
  try {
    const id = selectedSection.value;
    const batch = writeBatch(db);

    const flagKey = `about_${id}`;

    // update flags doc (merge)
    batch.set(
      doc(db, "settings", "public_flags"),
      { [flagKey]: showSectionPublic.value, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // mirror to section doc so rules can check it
    batch.set(
      doc(db, "about_sections", id),
      { isVisible: showSectionPublic.value, updatedAt: serverTimestamp() },
      { merge: true }
    );

    await batch.commit();
    visSavedAt.value = new Date().toLocaleString();
  } catch (err) {
    console.error("saveAboutVisibility error", err);
    alert("Failed to update visibility. Try again.");
  }
}

/* -------------------- Embed helper -------------------- */
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

/* -------------------- Edit toggle -------------------- */
function toggleEdit() {
  if (isEditing.value) {
    form.value.title = baseline.value.title;
    form.value.coverImageUrl = baseline.value.coverImageUrl;
    form.value.content = baseline.value.content;
    form.value.videoUrl = baseline.value.videoUrl;

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
.bg-maroon {
  background-color: #740505;
}

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
.EditorContent span[style*="font-size"],
.EditorContent span[style*="color"] {
  display: inline-block;
}
</style>
