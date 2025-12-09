<template>
  <AddContentLayout
    createTitle="Create News"
    editTitle="Edit News"
    :isEditMode="isEditMode"
    :saving="saving"
    :lastAction="lastAction"
    :notice="notice"
    :validationError="validationError"
    :isValid="isValid"
    @close="handleClose"
    @save="submitNews(false)"
    @publish="submitNews(true)"
    @clear-notice="notice = null"
  >
    <!-- Basic fields -->
    <div class="grid gap-6 md:grid-cols-2">
      <div>
        <label class="mb-1 block font-semibold">Title</label>
        <input v-model="form.title" type="text" class="input input-bordered w-full" />
      </div>

      <div>
        <label class="mb-1 block font-semibold">Author</label>
        <input v-model="form.author" type="text" class="input input-bordered w-full" />
      </div>

      <!-- Cover Image (single-image upload component) -->
      <div class="md:col-span-2">
        <label class="mb-1 block font-semibold">Cover Image</label>
        <UiSingleImageUpload :image-url="form.imageUrl" @change="handleCoverImage" />
      </div>

      <!-- Description -->
      <div class="md:col-span-2">
        <label class="mb-1 block font-semibold">Description</label>
        <textarea v-model="form.description" rows="3" class="textarea textarea-bordered w-full" />
      </div>
    </div>

    <!-- Content (Editor is always shown) -->
    <div class="mt-4">
      <label class="mb-2 block font-semibold">Content</label>
      <UiTiptapEditor
        v-model="form.content"
        :editing="true"
        class="mt-2"
        @image-upload="handleEditorImageUpload"
      />
    </div>
  </AddContentLayout>
</template>

<script setup lang="ts">
  import AddContentLayout from "@/components/Admin/AddContentLayout.vue";
  import UiSingleImageUpload from "@/components/Admin/UiSingleImageUpload.vue";
  import UiTiptapEditor from "@/components/UiTiptapEditor.vue";
  import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    Timestamp,
  } from "firebase/firestore";
  import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
  import { computed, onMounted, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useFirebaseStorage, useFirestore } from "vuefire";

  definePageMeta({
    middleware: ["auth"],
    roles: ["faculty"],
    layout: "faculty",
  });

  const route = useRoute();
  const router = useRouter();
  const db = useFirestore();
  const storage = useFirebaseStorage();

  type Status = "draft" | "pending" | "published";

  /* form state */
  const initialForm = {
    title: "",
    author: "",
    description: "",
    imageUrl: "",
    content: "",
    createdAt: undefined as Timestamp | undefined,
  };
  const form = ref({ ...initialForm });

  const isEditMode = ref(false);
  const newsId = ref<string | null>(null);
  const existingStatus = ref<Status>("draft");

  /* saving state */
  const saving = ref(false);
  const lastAction = ref<"save" | "publish" | null>(null);

  /* validation + notices */
  const validationError = ref<string | null>(null);

  type NoticeType = "success" | "error";
  const notice = ref<{ type: NoticeType; title: string } | null>(null);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  function showNotice(n: { type: NoticeType; title: string }, ms = 3000) {
    notice.value = n;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => (notice.value = null), ms);
  }

  /** for disabling Save/Publish buttons */
  const isValid = computed(
    () => !!form.value.title.trim() && !!form.value.content.trim() && !!form.value.imageUrl
  );

  function deriveStatus(data: any): Status {
    const raw = typeof data.status === "string" ? data.status.toLowerCase() : "";
    if (raw === "draft" || raw === "pending" || raw === "published") return raw;
    return data.published === true ? "published" : "draft";
  }

  /** Prefill in edit mode via ?id=... */
  onMounted(async () => {
    const id = (route.query.id as string) || null;
    if (!id) return;

    isEditMode.value = true;
    newsId.value = id;

    const snap = await getDoc(doc(db, "news", id));
    if (!snap.exists()) return;

    const data: any = snap.data();
    form.value.title = data.title || "";
    form.value.author = data.author || "";
    form.value.description = data.description || "";
    form.value.imageUrl = data.imageUrl || "";
    form.value.content = data.content || "";
    form.value.createdAt = data.createdAt;

    existingStatus.value = deriveStatus(data);
  });

  /** Cover image upload to Storage (now driven by AdminSingleImageUpload) */
  async function handleCoverImage(e: Event) {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    try {
      const path = `news_images/${Date.now()}-${file.name}`;
      const fileRef = storageRef(storage, path);
      const snap = await uploadBytes(fileRef, file);
      form.value.imageUrl = await getDownloadURL(snap.ref);
    } catch (err) {
      console.error("❌ Cover image upload failed:", err);
      showNotice({
        type: "error",
        title: "Failed to upload cover image.",
      });
    }
  }

  /** Image upload for the editor (UiTiptapEditor @image-upload) */
  async function handleEditorImageUpload(file: File): Promise<string> {
    const path = `editor_images/news/${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage, path);
    const snap = await uploadBytes(fileRef, file);
    return await getDownloadURL(snap.ref);
  }

  function validateForm(): boolean {
    if (!form.value.title.trim() || !form.value.content.trim()) {
      validationError.value = "Title and content are required.";
      return false;
    }
    if (!form.value.imageUrl) {
      validationError.value = "Please upload a cover image.";
      return false;
    }
    validationError.value = null;
    return true;
  }

  /** Save handler (draft / pending for approval) */
  async function submitNews(publish: boolean) {
    if (saving.value) return;
    lastAction.value = publish ? "publish" : "save";

    if (!validateForm()) {
      lastAction.value = null;
      return;
    }

    saving.value = true;

    const status: Status = publish ? "pending" : isEditMode.value ? existingStatus.value : "draft";

    const payload: any = {
      title: form.value.title,
      author: form.value.author,
      description: form.value.description,
      imageUrl: form.value.imageUrl,
      content: form.value.content,
      status,
      published: status === "published",
      createdAt: isEditMode.value ? (form.value.createdAt ?? serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: status === "published" ? serverTimestamp() : null,
    };

    try {
      if (isEditMode.value && newsId.value) {
        await setDoc(doc(db, "news", newsId.value), payload, { merge: true });
        existingStatus.value = status;

        const msg = status === "pending" ? "News changes submitted for approval." : "News updated.";
        showNotice({ type: "success", title: msg });
      } else {
        await addDoc(collection(db, "news"), payload);
        existingStatus.value = status;

        const msg =
          status === "pending"
            ? "News submitted for Super Admin approval."
            : "News saved as draft.";
        showNotice({ type: "success", title: msg });

        form.value = { ...initialForm };
      }
    } catch (error) {
      console.error("❌ Failed to save news:", error);
      showNotice({
        type: "error",
        title: "Failed to save news. Check your Firestore rules/connection.",
      });
    } finally {
      saving.value = false;
      lastAction.value = null;
    }
  }

  /** Close behavior */
  function handleClose() {
    if (isEditMode.value && newsId.value) {
      router.push(`/Admin/faculty/news/${newsId.value}`);
    } else {
      router.push("/Admin/faculty/news");
    }
  }
</script>

<style>
  .text-maroon {
    color: #740505;
  }
  .bg-maroon {
    background-color: #740505;
  }
  .border-maroon {
    border-color: #740505;
  }

  .ProseMirror {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }
  .EditorContent {
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
    min-height: 300px;
    background-color: #ffffff;
  }
</style>
