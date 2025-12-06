<template>
  <div class="mx-auto mt-8 max-w-3xl space-y-6">
    <!-- Header + actions -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col">
        <span class="font-montserrat text-4xl font-bold text-red-900"> Manage Social Icons</span>
        <span class="font-montserrat text-xs">
          Manage social media links shown in the website navbar
        </span>
      </div>

      <div class="flex gap-2">
        <UiButton
          class="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          @click="goBack"
        >
          ← Back
        </UiButton>
        <UiButton
          class="bg-maroon text-white hover:opacity-90"
          :disabled="saving"
          @click="save"
        >
          Save
        </UiButton>
      </div>
    </div>

    <!-- Notice -->
    <transition name="fade">
      <div
        v-if="notice"
        class="rounded border p-3"
        :class="
          notice.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        "
      >
        {{ notice.text }}
      </div>
    </transition>

    <!-- Live preview (icons only, like navbar) -->
    <section class="rounded border bg-white p-4">
      <div class="mb-2 text-sm font-medium text-gray-600">Live preview</div>
      <div class="flex items-center gap-6">
        <a
          v-for="it in previewItems"
          :key="it.key"
          :href="it.href"
          target="_blank"
          rel="noopener"
          class="text-maroon transition-opacity hover:opacity-80"
          :title="labelFor(it.key)"
        >
          <component :is="iconFor(it.key)" class="h-6 w-6" />
        </a>
      </div>
    </section>

    <!-- Form -->
    <form class="space-y-5" @submit.prevent="save">
      <p class="text-sm text-gray-500">
        Add links for the platforms you want shown in the navbar. Leave others
        blank to hide them. (http/https, mailto:, or tel: are accepted)
      </p>

      <div v-for="p in PLATFORMS" :key="p.key" class="grid gap-2">
        <label class="text-sm font-medium">{{ p.label }}</label>
        <input
          v-model.trim="form[p.key]"
          type="text"
          :placeholder="p.placeholder"
          class="input input-bordered w-full"
        />
        <p v-if="p.help" class="text-xs text-gray-400">{{ p.help }}</p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Globe,
} from 'lucide-vue-next'

const router = useRouter()
const db = useFirestore()

/** Platforms shown in the form and their placeholders (TikTok removed) */
const PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/your-page',
    help: '',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/your-handle',
    help: '',
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    placeholder: 'https://twitter.com/your-handle',
    help: '',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@yourchannel',
    help: '',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://www.linkedin.com/school/your-page',
    help: '',
  },
  {
    key: 'website',
    label: 'Website',
    placeholder: 'https://your.site',
    help: 'Optional extra link',
  },
] as const

type PlatformKey = (typeof PLATFORMS)[number]['key']

/* ---------- Firestore ---------- */
const socialsRef = doc(db, 'site', 'socials')

/* ---------- Form state ---------- */
const form = reactive<Record<PlatformKey, string>>({
  facebook: '',
  instagram: '',
  twitter: '',
  youtube: '',
  linkedin: '',
  website: '',
})

onMounted(async () => {
  const snap = await getDoc(socialsRef)
  const data = (snap.exists() ? snap.data() : {}) as Record<PlatformKey, string>
  PLATFORMS.forEach(p => {
    form[p.key] = data[p.key] || ''
  })
})

/* ---------- Live preview helpers ---------- */
const ORDER: PlatformKey[] = [
  'facebook',
  'instagram',
  'twitter',
  'youtube',
  'linkedin',
  'website',
]
const ICONS: Record<PlatformKey, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  website: Globe,
}

function iconFor(key: PlatformKey) {
  return ICONS[key]
}
function labelFor(key: PlatformKey) {
  return PLATFORMS.find(p => p.key === key)?.label || key
}
function isOk(v?: string) {
  return (
    typeof v === 'string' &&
    !!v.trim() &&
    /^(https?:\/\/|mailto:|tel:)/i.test(v.trim())
  )
}

const previewItems = computed(() =>
  ORDER.map(k => ({ key: k, href: (form[k] || '').trim() })).filter(x =>
    isOk(x.href),
  ),
)

/* ---------- Save ---------- */
const saving = ref(false)
const notice = ref<{ type: 'success' | 'error'; text: string } | null>(null)

async function save() {
  saving.value = true
  try {
    const payload: Record<string, string> = {}
    for (const { key } of PLATFORMS) {
      payload[key] = (form[key] || '').trim()
    }
    await setDoc(socialsRef, payload, { merge: true })
    notice.value = { type: 'success', text: 'Social links saved.' }
  } catch (e) {
    console.error(e)
    notice.value = { type: 'error', text: 'Failed to save. Please try again.' }
  } finally {
    saving.value = false
    setTimeout(() => (notice.value = null), 3000)
  }
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.bg-maroon {
  background-color: #740505;
}
.text-maroon {
  color: #740505;
}
</style>
