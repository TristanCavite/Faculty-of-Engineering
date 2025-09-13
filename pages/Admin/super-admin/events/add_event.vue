<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <h1 class="text-maroon mb-6 text-2xl font-bold">
      {{ isEditMode ? "Edit Event" : "Add New Event" }}
    </h1>
    <div v-if="isEditMode" class="mb-4 text-sm text-gray-500">
      You are editing an existing event.
    </div>

    <!--
      FIX ①②③: prevent accidental submits
      - @submit.prevent.stop : stop native submit and bubbling
      - @keydown.enter.capture="preventEnterSubmit" : block Enter-to-submit (except textarea/contentEditable)
      - @click.capture="preventImplicitSubmit" : cancel clicks on implicit submit buttons inside the form
    -->
    <form
      @submit.prevent.stop="handleSubmit"
      @keydown.enter.capture="preventEnterSubmit"
      @click.capture="preventImplicitSubmit"
      class="space-y-6"
      novalidate
    >
      <!-- Title -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
        <input
          v-model="form.title"
          type="text"
          required
          class="input input-bordered w-full"
          placeholder="Enter event title"
        />
      </div>

      <!-- Date Picker -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Date</label>
        <input v-model="form.date" type="date" required class="input input-bordered w-full" />
      </div>


      <!-- Event Type / Audience -->
<div>
  <label class="mb-1 block text-sm font-medium text-gray-700">
    Event Type / Audience
  </label>

  <select
    v-model="form.eventType"
    class="select select-bordered w-full"
  >
    <option disabled value="">Select event type (for filtering)</option>
    <option v-for="t in EVENT_TYPES" :key="t.value" :value="t.value">
      {{ t.label }}
    </option>
  </select>

  <p class="mt-1 text-xs text-gray-500">
    Used for the Events page filter (separate from the calendar).
  </p>
</div>


      <!-- Description -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Short Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          required
          class="textarea textarea-bordered w-full"
          placeholder="Enter a brief description of the event"
        />
      </div>

      <!-- Cover Images -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Cover Images</label>
        <input type="file" accept="image/*" multiple @change="handleFileChange" />
        <div v-if="previewUrls.length" class="mt-2 flex gap-4 overflow-x-auto">
          <img
            v-for="(src, i) in previewUrls"
            :key="i"
            :src="src"
            class="h-40 rounded border object-cover"
          />
        </div>
      </div>

      <!-- Tiptap Editor -->
      <div>
        <!--
          FIX ④: block toolbar buttons inside the editor from submitting the form.
          Any <button> inside this wrapper that is NOT the real submit button will be prevented.
        -->
        <div @click.capture="blockSubmitsFromEditor">
          <label class="mb-1 block text-sm font-medium text-gray-700">Content</label>
          <UiTiptapEditor
            v-if="editorReady"
            :modelValue="form.content"
            :editing="true"
            class="rounded border border-gray-300 bg-white"
            @update:modelValue="(val) => (form.content = val)"
            @imageUpload="handleEditorImageUpload"
          />
        </div>
      </div>

      <!-- Save Button -->
      <div class="pt-4">
        <!--
          FIX ⑤: mark the real submit button so our click-capture logic can allow it.
          Also ensure explicit type="submit".
        -->
        <UiButton
          class="bg-maroon text-white"
          type="submit"
          data-primary-submit="1"
          :disabled="loading"
        >
          {{ loading ? "Saving..." : isEditMode ? "Update Event" : "Create Event" }}
        </UiButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFirestore, useStorage } from "vuefire";

definePageMeta({ layout: "super-admin" });

const db = useFirestore();
const storage = useStorage();
const router = useRouter();
const route = useRoute();

const isEditMode = computed(() => !!route.query.id);

const EVENT_TYPES = [
  { value: 'faculty',      label: 'Faculty' },
  { value: 'students',     label: 'Students' },
  { value: 'faculty-wide', label: 'Faculty Wide' },
] as const

type EventType = '' | 'faculty' | 'students' | 'faculty-wide'



const form = ref({
  title: "",
  date: "",
  description: "",
  content: "",
  coverImages: [] as string[],
  eventType: '' as EventType,
});

const imageFiles = ref<File[]>([]);
const previewUrls = ref<string[]>([]);
const loading = ref(false);
const editorReady = ref(false);

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files) return;
  imageFiles.value = Array.from(files);
  previewUrls.value = imageFiles.value.map((file) => URL.createObjectURL(file));
};

// Load existing event
onMounted(async () => {
  const id = route.query.id as string;
  editorReady.value = true;
  if (isEditMode.value && id) {
    const snap = await getDoc(doc(db, "events", id));
    if (snap.exists()) {
      const data = snap.data();
      form.value = {
        title: (data as any).title || "",
        date: (data as any).date || "",
        description: (data as any).description || "",
        content: (data as any).content || "",
        coverImages: (data as any).coverImages || [],
        eventType:    (data.eventType as EventType) || '',
      };
      previewUrls.value = form.value.coverImages;
    }
  }
});

// ===============================
// SUBMIT & GUARDS
// ===============================

/** FIX ⑥: Ignore duplicate triggers if a save is already in progress. */
const handleSubmit = async () => {
  if (loading.value) return; // re-entrancy guard
  loading.value = true;

  try {
    const id = (route.query.id as string) || crypto.randomUUID();
    let uploadedUrls: string[] = form.value.coverImages || [];

    if (imageFiles.value.length) {
      uploadedUrls = [];
      for (const [index, file] of imageFiles.value.entries()) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `events/${id}/cover_${index}.${ext}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedUrls.push(url);
      }
    }

    const eventData: any = {
      ...form.value,
      coverImages: uploadedUrls,
      updatedAt: serverTimestamp(),
    };

    if (!isEditMode.value) {
      eventData.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, "events", id), eventData, { merge: true });
    router.push("/admin/super-admin/events");
  } catch (err) {
    console.error("Error saving event:", err);
    alert("Something went wrong. Please try again.");
  } finally {
    loading.value = false;
  }
};

/**
 * FIX helper A:
 * Prevent Enter key from submitting the form when focus is on inputs.
 * Allows Enter inside <textarea> or contentEditable editors.
 */
function preventEnterSubmit(e: KeyboardEvent) {
  const el = e.target as HTMLElement;
  const isTextarea = el.tagName === "TEXTAREA";
  const isCE = (el as any)?.isContentEditable === true;
  if (!isTextarea && !isCE) {
    e.preventDefault();
  }
}

/**
 * FIX helper B:
 * If a click came from a <button> inside the form and it is NOT our real submit button,
 * stop it from submitting. Many third-party toolbars use <button> without type="button".
 */
function preventImplicitSubmit(e: Event) {
  const target = e.target as HTMLElement;
  const btn = target?.closest?.("button") as HTMLButtonElement | null;
  if (!btn) return;
  const isPrimary = btn.dataset?.primarySubmit === "1";
  if (!isPrimary) {
    // Cancel implicit submit (but let the toolbar action itself proceed)
    if (!btn.type || btn.type.toLowerCase() === "submit") {
      e.preventDefault();
    }
  }
}

/**
 * FIX helper C:
 * Extra safety just around the editor area—block any <button> clicks from submitting.
 */
function blockSubmitsFromEditor(e: Event) {
  const target = e.target as HTMLElement;
  const btn = target?.closest?.("button") as HTMLButtonElement | null;
  if (!btn) return;
  // If the button is inside the editor UI, always prevent default submit.
  if (!btn.type || btn.type.toLowerCase() === "submit") {
    e.preventDefault();
  }
}

// ===============================
// Editor inline image upload
// ===============================
const handleEditorImageUpload = async (file: File): Promise<string> => {
  const fileId = crypto.randomUUID();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `events/editor/${fileId}.${ext}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};
</script>
