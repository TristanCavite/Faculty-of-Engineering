<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Manage OBE Page</h1>
    </div>

    <!-- Form Section -->
    <div class="grid gap-6">
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
          alt="OBE cover"
        />
        <p v-if="pendingCoverPreview" class="mt-1 text-xs text-amber-600">
          This image is not saved yet — it will be uploaded when you click <b>Save Changes</b>.
        </p>
      </div>

      <!-- Content -->
      <div>
        <label class="mb-2 block font-semibold">Content</label>

        <!-- Edit / Cancel toggle -->
        <UiButton class="bg-maroon text-white hover:opacity-90" @click="toggleEdit">
          {{ isEditing ? "Cancel" : "Edit Content" }}
        </UiButton>

        <!-- PREVIEW: same wrapper/classes as public pages -->
        <div
          v-if="!isEditing"
          class="cet-content prose max-w-none rounded border bg-white p-4 shadow"
          v-html="form.content"
        />

        <!-- EDITOR: same wrapper so it looks identical while editing -->
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
            @click="savePage"
          >
            Save Changes
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import UiTiptapEditor from "@/components/UiTiptapEditor.vue";
  import { doc, getDoc, setDoc } from "firebase/firestore";
  import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
  import { computed, onMounted, ref } from "vue";
  import { useFirebaseStorage, useFirestore } from "vuefire";

  definePageMeta({ middleware: "auth", layout: "super-admin" });

  const db = useFirestore();
  const storage = useFirebaseStorage();

  /** UI state */
  const isEditing = ref(false);

  /** Form model */
  const form = ref({
    coverImageUrl: "",
    content: "",
  });

  const coverInput = ref<HTMLInputElement | null>(null);

  /** Pending (unsaved) cover image */
  const pendingCoverFile = ref<File | null>(null);
  const pendingCoverPreview = ref<string | "">("");

  /** Baseline snapshot */
  const baseline = ref({ coverImageUrl: "", content: "" });

  /** Load existing OBE page on mount */
  onMounted(async () => {
    const snap = await getDoc(doc(db, "obe_page", "main"));
    if (snap.exists()) {
      const data = snap.data() as any;
      form.value.coverImageUrl = data.coverImageUrl || "";
      form.value.content = data.content || "";
    }
    baseline.value = { ...form.value };
  });

  /** Dirty checker */
  const isDirty = computed(
    () =>
      !!pendingCoverFile.value ||
      form.value.coverImageUrl !== baseline.value.coverImageUrl ||
      form.value.content !== baseline.value.content
  );

  /** Pick cover image */
  function handleImage(e: Event) {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
    pendingCoverFile.value = file;
    pendingCoverPreview.value = URL.createObjectURL(file);
  }

  /** TipTap image uploader */
  async function handleEditorImageUpload(file: File) {
    const path = `editor_images/${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage, path);
    const snap = await uploadBytes(fileRef, file);
    return await getDownloadURL(snap.ref);
  }

  /** Save changes */
  async function savePage() {
    if (!isDirty.value) return;

    if (pendingCoverFile.value) {
      const path = `obe_page/cover.jpg`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, pendingCoverFile.value);
      form.value.coverImageUrl = await getDownloadURL(fileRef);
    }

    const payload = {
      coverImageUrl: form.value.coverImageUrl,
      content: form.value.content,
    };

    await setDoc(doc(db, "obe_page", "main"), payload);

    if (pendingCoverPreview.value) URL.revokeObjectURL(pendingCoverPreview.value as string);
    pendingCoverFile.value = null;
    pendingCoverPreview.value = "";
    if (coverInput.value) coverInput.value.value = "";

    baseline.value = { ...form.value };
    isEditing.value = false;
    alert("OBE Page updated!");
  }

  /** Toggle edit mode */
  function toggleEdit() {
    if (isEditing.value) {
      form.value = { ...baseline.value };
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
.bg-maroon { background-color: #740505; }

/* Editor chrome (typography comes from .cet-content/.prose) */
.ProseMirror { outline: none !important; }

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

/* Make legacy inline spans layout nicely if any remain */
.EditorContent span[style*="font-size"],
.EditorContent span[style*="color"] {
  display: inline-block;
}

</style>
