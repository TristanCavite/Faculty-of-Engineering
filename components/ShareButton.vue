<template>
  <main>
    <!-- Share Button -->
    <UiButton @click.stop="openShare" class="inline-flex px-2 py-1 text-xs font-semibold transition bg-red-800 rounded hover:bg-red-900 hover:scale-105 font-montserrat">
      <Send/>
      Share..
    </UiButton>

    <!-- Inlined Share Modal -->
    <div v-if="showShare && shareContent" class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" @mousedown="handleOutsideClick">
      <div class="w-11/12 h-auto pb-4 bg-white rounded-lg md:w-96" ref="modalRef">
        <div class="flex justify-end">
          <UiButton class="bg-transparent hover:bg-transparent hover:scale-125" @click="showShare = false" >
            <X class="text-black" />
          </UiButton>
        </div>

        <div class="flex flex-col justify-start pl-4">
          <span class="text-xl font-bold">Share</span>
          <span class="text-xs font-semibold">Choose a platform or copy the link</span>
        </div>

        <div class="px-4 mt-2">
          <div class="flex items-center w-full py-1 pl-2 bg-green-400 rounded">
            <span class="text-xs font-normal">Share via device...</span>
          </div>
        </div>

        <div class="flex flex-row justify-center pl-4 mt-2 space-x-8">
          <!-- Facebook -->
          <div>
            <div class="flex items-center justify-center mx-auto bg-blue-900 rounded-full size-10">
              <a :href="facebookHref" target="_blank" rel="noopener noreferrer">
                <Facebook class="text-white" />
              </a>
            </div>
            <span class="text-sm font-medium text-center">Facebook</span>
          </div>

          <!-- Gmail -->
          <div>
            <div class="flex items-center justify-center bg-red-900 rounded-full size-10">
              <a :href="mailtoHref">
                <Mail class="text-white" />
              </a>
            </div>
            <span class="text-sm font-medium text-center">Gmail</span>
          </div>

          <!-- Messenger -->
          <div>
            <div class="flex items-center justify-center mx-auto bg-blue-500 rounded-full size-10">
              <a :href="messengerHref" target="_blank" rel="noopener noreferrer">
                <Zap class="flex justify-center text-white -rotate-45 -scale-x-100 fill-white" />
              </a>
            </div>
            <span class="text-sm font-medium text-center">Messenger</span>
          </div>
        </div>

        <!-- Copy Link -->
        <div class="px-4 mt-10">
          <div class="flex items-center justify-between flex-shrink-0 w-full pl-2 text-black bg-gray-300 rounded-lg">
            <span :title="shareUrl" class="text-base font-normal truncate">{{ shareUrl }}</span>
            <UiButton @click="copyShareUrl" class="bg-green-600 hover:bg-green-700 hover:scale-105">
              <Link class="text-white" />
              {{ copied ? 'Copied!' : 'Copy Link' }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRequestURL, useRuntimeConfig } from '#imports'
import { Facebook, Mail, Zap, X, Link, Send} from 'lucide-vue-next'

type Item = {
  id: string
  type: 'research' | 'news' | 'event' | 'profile'
  slug?: string
  url?: string
  title?: string
  name?: string
  topic?: string
  excerpt?: string | null
  description?: string | null
  content?: string | null
}

type ShareContent = { url: string; title: string; excerpt?: string }

const { item } = defineProps<{ item: Item }>()

/* ---------- Button state ---------- */
const route = useRoute()
const showShare = ref(false)
const shareContent = ref<ShareContent | null>(null)

/* ---------- Helpers for button ---------- */
const strip = (s?: any) =>
  s ? String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''

function inferBaseFromRoute(): string {
  const seg = route.path.replace(/^\/+/, '').split('/')[0] || ''
  if (seg === 'news') return '/news/'
  if (seg === 'events') return '/events/'
  if (seg === 'about') return '/about/dept_personels/'
  return '/research/'
}

function resolveUrl(i: Item): string {
  if (i.url) return i.url
  const idOrSlug = i.slug ?? i.id
  if (!idOrSlug) return route.path
  const baseByType =
    i.type === 'news' ? '/news/' :
    i.type === 'event' ? '/events/' :
    i.type === 'profile' ? '/about/dept_personels/' :
    '/research/'
  const base = baseByType ?? inferBaseFromRoute()
  return base + idOrSlug
}

function openShare() {
  const url = resolveUrl(item)
  const title = item.title ?? 'Share'
  const raw = item.excerpt ?? item.description ?? item.content ?? ''
  const text = strip(raw)
  const excerpt = text.length > 220 ? text.slice(0, 217) + '…' : text
  shareContent.value = { url, title, excerpt }
  showShare.value = true
}

/* ---------- Modal logic (inlined) ---------- */
const runtime = useRuntimeConfig()
const copied = ref(false)
const isClient = typeof window !== 'undefined'
const origin = (runtime.public?.SITE_URL as string | undefined) || useRequestURL().origin

const shareUrl = computed(() => new URL(shareContent.value!.url, origin).href)
const shareTitle = computed(() => shareContent.value!.title)
const shareText = computed(() => {
  const raw = (shareContent.value?.excerpt || '').replace(/\s+/g, ' ').trim()
  return raw
    ? `${shareTitle.value} — ${raw.length > 220 ? raw.slice(0, 217) + '…' : raw}`
    : shareTitle.value
})

const textToCopy = computed(() =>
  `${shareText.value}\n\n${shareUrl.value}`
)

/* Email */
const mailtoHref = computed(
  () => `mailto:?subject=${encodeURIComponent(shareTitle.value)}&body=${encodeURIComponent(`${shareText.value}\n\n${shareUrl.value}`)}`
)

/* Facebook */
const facebookHref = computed(
  () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`
)

/* Messenger */
const FB_APP_ID = runtime.public?.FB_APP_ID as string | undefined
const redirectUrl = computed(() => new URL('/share/complete', origin).href) // must be whitelisted in your FB app
const isMobile = computed(() => isClient && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))

const messengerHref = computed(() => {
  if (isMobile.value) {
    return `fb-messenger://share/?link=${encodeURIComponent(shareUrl.value)}`
  }
  if (FB_APP_ID) {
    return `https://www.facebook.com/dialog/send?app_id=${encodeURIComponent(FB_APP_ID)}&link=${encodeURIComponent(shareUrl.value)}&redirect_uri=${encodeURIComponent(redirectUrl.value)}&display=popup`
  }
  return facebookHref.value
})

/* Outside click to close */
const modalRef = ref<HTMLElement | null>(null)
function handleOutsideClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (modalRef.value && target && !modalRef.value.contains(target)) {
    showShare.value = false
  }
}

/* Copy link (Clipboard API with fallback) */
async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(textToCopy.value)
    copied.value = true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = textToCopy.value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(ta)
    }
    copied.value = true
  }
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<style>
/* Optional debug outlines
* { outline: 1px solid red; }
*/
</style>
