<template>
  <div
    ref="wrap"
    class="relative w-full overflow-hidden"
    :style="{ height: scaledHeight + 'px' }"
  >
    <div
      ref="inner"
      class="absolute top-0 left-1/2 origin-top"
      :style="{ transform: `translateX(-50%) scale(${scale})`, width: baseWidth + 'px' }"
    >
      <UiCalendar
        class="calendar-tight !m-0 !p-0 w-max"
        :attributes="attributes"
        v-model:selectedDate="model"
        @date-click="onDateClick"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  attributes?: any[]
  selectedDate?: Date | null
  /** Optional: cap the visual height (leave undefined to avoid any clipping) */
  maxHeight?: number
}>()

const emit = defineEmits<{
  (e: 'update:selectedDate', v: Date | null): void
  (e: 'date-click', v: Date): void
}>()

const model = computed<Date | null>({
  get: () => props.selectedDate ?? null,
  set: (v) => emit('update:selectedDate', v),
})

function onDateClick(d: Date) {
  emit('date-click', d)
}

const wrap = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)

const scale = ref(1)
const scaledHeight = ref(0)
/** width we measure from the calendar and keep stable between months */
const baseWidth = ref(0)

let roWrap: ResizeObserver | null = null
let roCal: ResizeObserver | null = null

const getCal = () => inner.value?.firstElementChild as HTMLElement | null

async function fit() {
  await nextTick()
  const w = wrap.value, i = inner.value, cal = getCal()
  if (!w || !i || !cal) return

  // neutralize scale for natural measurements (but keep centering)
  i.style.transform = 'translateX(-50%) scale(1)'
  await nextTick()

  const rect = cal.getBoundingClientRect()
  const natW = rect.width || 1
  const natH = rect.height || 1

  // remember the widest version we've seen so months don't "shrink"
  baseWidth.value = Math.max(baseWidth.value || 0, natW)

  const targetW = w.clientWidth || baseWidth.value
  const EPS = 1.5
  const sW = (targetW - EPS) / (baseWidth.value || natW)
  const sH = props.maxHeight ? props.maxHeight / natH : Number.POSITIVE_INFINITY
  const s = Math.min(sW, sH)

  scale.value = s
  const h = Math.ceil(natH * s)
  scaledHeight.value = props.maxHeight ? Math.min(h, props.maxHeight) : h

  i.style.transform = `translateX(-50%) scale(${s})`
}

onMounted(async () => {
  await fit()

  // refit when the wrapper width changes
  roWrap = new ResizeObserver(() => fit())
  if (wrap.value) roWrap.observe(wrap.value)

  // *** important: refit when THE CALENDAR changes its own size (month/nav/fonts) ***
  roCal = new ResizeObserver(() => fit())
  const cal = getCal()
  if (cal) roCal.observe(cal)

  window.addEventListener('resize', fit)

  // fonts can change metrics after first paint -> refit again
  // @ts-ignore
  if (document.fonts?.ready) {
    // @ts-ignore
    document.fonts.ready.then(() => fit())
  }
})

onUnmounted(() => {
  if (roWrap && wrap.value) roWrap.unobserve(wrap.value)
  if (roCal) {
    const cal = getCal()
    if (cal) roCal.unobserve(cal)
  }
  roWrap = roCal = null
  window.removeEventListener('resize', fit)
})

// refit on reactive inputs
watch(() => props.attributes, () => fit(), { deep: true })
watch(() => props.selectedDate, () => fit())
watch(() => props.maxHeight, () => fit())
</script>

<style scoped>
:deep(.calendar-tight){ padding:0 !important; margin:0 !important; }
:deep(.calendar-tight > *){ padding:0 !important; margin:0 !important; }
/* strip v-calendar container chrome so we measure the real grid */
:deep(.vc-container){ padding:0 !important; border:none !important; box-shadow:none !important; }
</style>
