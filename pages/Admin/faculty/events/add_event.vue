<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div class="mb-6 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-maroon">
        {{ isEditMode ? 'Edit Event' : 'Add New Event' }}
      </h1>

      <div class="flex items-center gap-3">
        <UiButton type="button" class="btn-outline-maroon" @click="router.push('/admin/faculty/events')">
          Close
        </UiButton>

        <UiButton
          type="button"
          class="btn-outline-maroon"
          :disabled="loading"
          @click="saveEvent(false)"
        >
          {{ loading && lastAction === 'save' ? 'Saving…' : 'Save' }}
        </UiButton>

        <UiButton
          type="button"
          class="bg-maroon text-white hover:opacity-90"
          :disabled="loading"
          @click="saveEvent(true)"
        >
          {{ loading && lastAction === 'publish' ? 'Publishing…' : 'Publish' }}
        </UiButton>
      </div>
    </div>

    <div v-if="isEditMode" class="mb-2 text-sm text-gray-500">
      You are editing an existing event.
    </div>

    <p
      v-if="validationError"
      class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ validationError }}
    </p>

    <form
      @submit.prevent
      @keydown.enter.capture="preventEnterSubmit"
      class="space-y-6"
      novalidate
    >
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
        <input
          v-model="form.title"
          type="text"
          class="input input-bordered w-full"
          placeholder="Enter event title"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
        <input v-model="form.date" type="date" class="input input-bordered w-full" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
        <input v-model="form.dateEnd" type="date" class="input input-bordered w-full" />
        <p class="mt-1 text-xs text-gray-500">Leave blank if the event is only one day.</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">
          Event Type / Audience
        </label>
        <select v-model="form.eventType" class="select select-bordered w-full">
          <option disabled value="">Select event type (for filtering)</option>
          <option v-for="t in EVENT_TYPES" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Used for the Events page filter (separate from the calendar).
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Short Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          class="textarea textarea-bordered w-full"
          placeholder="Enter a brief description of the event"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Cover Images</label>
        <input type="file" accept="image/*" multiple @change="handleFileChange" />
        <div v-if="previewUrls.length" class="mt-2 flex gap-4 overflow-x-auto">
          <div
            v-for="(src, i) in previewUrls"
            :key="i"
            class="relative"
          >
            <img
              :src="src"
              class="h-40 rounded border object-cover"
            />
            <button
              type="button"
              class="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-red-600 shadow hover:bg-white"
              aria-label="Remove image"
              @click="removeImageAt(i)"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div @click.capture="blockSubmitsFromEditor">
        <label class="mb-1 block text-sm font-medium text-gray-700">Content</label>
        <UiTiptapEditor
          v-if="editorReady"
          :modelValue="form.content"
          :editing="true"
          class="rounded border border-gray-300 bg-white"
          @update:modelValue="val => (form.content = val)"
          @imageUpload="handleEditorImageUpload"
        />
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

definePageMeta({
  middleware: ["auth"],
  roles: ["faculty"],
  layout: "faculty",
});

const db = useFirestore();
const storage = useStorage();
const router = useRouter();
const route = useRoute();

const isEditMode = computed(() => !!route.query.id);

const EVENT_TYPES = [
  { value: "university", label: "University" },
  { value: "faculty", label: "Faculty" },
  { value: "students", label: "Students" },
  { value: "department", label: "Department" },
  { value: "general", label: "General" },
] as const;
type EventType = (typeof EVENT_TYPES)[number]["value"] | "";

type Status = "draft" | "pending" | "published";

const form = ref({
  title: "",
  date: "",
  dateEnd: "",
  description: "",
  content: "",
  coverImages: [] as string[],
  eventType: "" as EventType,
});

const imageFiles = ref<File[]>([]);
const previewUrls = ref<string[]>([]);
const loading = ref(false);
const lastAction = ref<"save" | "publish" | null>(null);
const editorReady = ref(false);
const validationError = ref<string | null>(null);
const existingStatus = ref<Status>("draft");

function refreshPreviews() {
  const localPreviews = imageFiles.value.map((f) => URL.createObjectURL(f));
  previewUrls.value = [...form.value.coverImages, ...localPreviews];
}

function handleFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;

  const newFiles = Array.from(files);
  imageFiles.value = [...imageFiles.value, ...newFiles];

  refreshPreviews();
  (e.target as HTMLInputElement).value = "";
}

function removeImageAt(idx: number) {
  const existingCount = form.value.coverImages.length;

  if (idx < existingCount) {
    form.value.coverImages.splice(idx, 1);
  } else {
    const localIndex = idx - existingCount;
    if (localIndex >= 0 && localIndex < imageFiles.value.length) {
      imageFiles.value.splice(localIndex, 1);
    }
  }

  refreshPreviews();
}

function deriveStatus(data: any): Status {
  const raw = typeof data.status === "string" ? data.status.toLowerCase() : "";
  if (raw === "draft" || raw === "pending" || raw === "published") return raw;
  return data.published === true ? "published" : "draft";
}

onMounted(async () => {
  editorReady.value = true;
  const id = route.query.id as string | undefined;
  if (!id) return;

  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) {
    refreshPreviews();
    return;
  }

  const data = snap.data() as any;
  form.value = {
    title: data.title || "",
    date: data.date || "",
    dateEnd: data.dateEnd || "",
    description: data.description || "",
    content: data.content || "",
    coverImages: data.coverImages || [],
    eventType: (data.eventType as EventType) || "",
  };

  existingStatus.value = deriveStatus(data);
  refreshPreviews();
});

function validateForm() {
  const { title, date, eventType, description, content } = form.value;
  if (
    !title.trim() ||
    !date ||
    !eventType ||
    !description.trim() ||
    !content.trim()
  ) {
    validationError.value = "Please fill in all required fields.";
    return false;
  }
  validationError.value = null;
  return true;
}

async function saveEvent(publish: boolean) {
  if (loading.value) return;
  lastAction.value = publish ? "publish" : "save";

  if (!validateForm()) {
    lastAction.value = null;
    return;
  }

  loading.value = true;
  try {
    const id = (route.query.id as string) || crypto.randomUUID();

    let coverImages: string[] = [...(form.value.coverImages || [])];

    if (imageFiles.value.length) {
      const offset = coverImages.length;
      for (const [index, file] of imageFiles.value.entries()) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `events/${id}/cover_${offset + index}.${ext}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, file);
        coverImages.push(await getDownloadURL(fileRef));
      }
    }

    const status: Status = publish
      ? "pending"
      : isEditMode.value
      ? existingStatus.value
      : "draft";

    const payload: any = {
      ...form.value,
      coverImages,
      status,
      published: status === "published",
      publishedAt: status === "published" ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    };
    if (!isEditMode.value) payload.createdAt = serverTimestamp();

    await setDoc(doc(collection(db, "events"), id), payload, { merge: true });
    existingStatus.value = status;

    alert(status === "pending" ? "Event submitted for approval." : "Event saved.");
    router.push("/admin/faculty/events");
  } catch (err) {
    console.error(err);
    alert("Something went wrong while saving the event.");
  } finally {
    loading.value = false;
  }
}

function preventEnterSubmit(e: KeyboardEvent) {
  const el = e.target as HTMLElement;
  if (el.tagName !== "TEXTAREA" && !(el as any).isContentEditable) e.preventDefault();
}

function blockSubmitsFromEditor(e: Event) {
  const btn = (e.target as HTMLElement)?.closest("button") as HTMLButtonElement | null;
  if (btn && (!btn.type || btn.type.toLowerCase() === "submit")) e.preventDefault();
}

const handleEditorImageUpload = async (file: File): Promise<string> => {
  const id = crypto.randomUUID();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `events/editor/${id}.${ext}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
.btn-outline-maroon {
  background-color: #ffffff;
  border: 1px solid #740505;
  color: #740505;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.btn-outline-maroon:hover {
  background-color: #740505;
  color: #ffffff;
}
</style>
