<template>
    <teleport to="body">
        <transition name="photo-modal" appear>
            <div
                v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                @click.self="close"
            >
                <div
                    class="relative w-auto max-w-full max-h-full"
                    @keydown.esc.prevent.stop="close"
                    tabindex="0"
                >
                    <!-- Close button -->
                    <UiButton
                        class="absolute z-10 flex items-center justify-center w-10 h-10 text-white rounded-full top-3 right-3 bg-black/50 hover:bg-black/70 focus:outline-none"
                        @click="close"
                        aria-label="Close"
                    >
                        <X class="w-5 h-5" />
                    </UiButton>

                    <!-- Image container -->
                    <div
                        class="relative overflow-hidden bg-black rounded-md cursor-zoom-in"
                        :class="{'cursor-grab': isZoomed, 'cursor-zoom-out': isZoomed === false && canZoom }"
                        @dblclick.prevent="toggleZoom"
                        @wheel.prevent="onWheel"
                        ref="container"
                    >
                        <img
                            :src="src"
                            :alt="alt"
                            :class="['select-none touch-none transition-transform duration-200 ease-out', { 'transform-gpu': true }]"
                            :style="imgStyle"
                            @pointerdown="startPan"
                            @pointermove="onPan"
                            @pointerup="endPan"
                            @pointercancel="endPan"
                            @pointerleave="endPan"
                            draggable="false"
                            @load="onImageLoad"
                        />
                        <!-- caption / slot -->
                        <div v-if="$slots.caption || caption" class="absolute bottom-0 left-0 right-0 p-3 text-sm text-white bg-black/40">
                            <slot name="caption">{{ caption }}</slot>
                        </div>
                    </div>

                    <!-- small controls: zoom toggle -->
                    <div class="flex items-center justify-between mt-2 text-sm text-gray-200">
                        <div class="flex items-center gap-2">
                            <UiButton
                                v-if="canZoom"
                                class="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
                                @click="toggleZoom"
                            >
                                {{ isZoomed ? 'Reset' : 'Zoom' }}
                            </UiButton>
                        </div>
                        <div class="text-xs text-gray-300 select-none">{{ imageSizeText }}</div>
                    </div>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

/**
 Props:
 - modelValue: boolean for v-model
 - src: image source
 - alt: alt text
 - caption: optional caption text
 - maxScale: optional maximum zoom scale
*/
const props = defineProps<{
    modelValue: boolean
    src: string
    alt?: string
    caption?: string
    maxScale?: number
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'close'): void
}>()

const modelValue = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v),
})

const close = () => {
    modelValue.value = false
    emit('close')
}

const isZoomed = ref(false)
const imgWidth = ref(0)
const imgHeight = ref(0)
const container = ref<HTMLElement | null>(null)
const scale = ref(1)
const minScale = 1
const maxScale = props.maxScale ?? 3
const offsetX = ref(0)
const offsetY = ref(0)
const startX = ref(0)
const startY = ref(0)
const prevOffsetX = ref(0)
const prevOffsetY = ref(0)
const panning = ref(false)

const canZoom = computed(() => {
    // allow zoom if image natural size is bigger than displayed or maxScale > 1
    return maxScale > 1
})

const imgStyle = computed(() => {
    return {
        transform: `translate3d(${offsetX.value}px, ${offsetY.value}px, 0) scale(${scale.value})`,
        transformOrigin: 'center center',
        maxWidth: '100%',
        maxHeight: '80vh',
        display: 'block',
        margin: '0 auto',
        userSelect: 'none',
        touchAction: 'none',
    } as Record<string, string | number>
})

const imageSizeText = computed(() => {
    return imgWidth.value && imgHeight.value ? `${imgWidth.value}×${imgHeight.value}` : ''
})

function onImageLoad(e: Event) {
    const img = e.target as HTMLImageElement
    imgWidth.value = img.naturalWidth
    imgHeight.value = img.naturalHeight
    // reset any transforms when image changes
    resetTransform()
}

function resetTransform() {
    scale.value = 1
    offsetX.value = 0
    offsetY.value = 0
    prevOffsetX.value = 0
    prevOffsetY.value = 0
    isZoomed.value = false
}

function toggleZoom() {
    if (!canZoom.value) return
    if (isZoomed.value) {
        resetTransform()
    } else {
        scale.value = Math.min(maxScale, 2)
        isZoomed.value = true
    }
}

function startPan(e: PointerEvent) {
    if (!isZoomed.value) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    panning.value = true
    startX.value = e.clientX
    startY.value = e.clientY
}

function onPan(e: PointerEvent) {
    if (!panning.value) return
    const dx = e.clientX - startX.value
    const dy = e.clientY - startY.value
    offsetX.value = prevOffsetX.value + dx
    offsetY.value = prevOffsetY.value + dy
}

function endPan(e?: PointerEvent) {
    if (!panning.value) return
    panning.value = false
    prevOffsetX.value = offsetX.value
    prevOffsetY.value = offsetY.value
    try {
        if (e && e.pointerId != null && (e.target as Element).releasePointerCapture) {
            ;(e.target as Element).releasePointerCapture(e.pointerId)
        }
    } catch {}
}

function onWheel(e: WheelEvent) {
    if (!canZoom.value) return
    const delta = -e.deltaY
    const zoomStep = delta > 0 ? 0.12 : -0.12
    let newScale = Math.min(maxScale, Math.max(minScale, scale.value + zoomStep))
    // Adjust offsets to zoom toward cursor (approximate)
    if (container.value) {
        const rect = container.value.getBoundingClientRect()
        const cx = e.clientX - rect.left - rect.width / 2
        const cy = e.clientY - rect.top - rect.height / 2
        const ratio = newScale / scale.value
        offsetX.value = offsetX.value * ratio + (1 - ratio) * cx
        offsetY.value = offsetY.value * ratio + (1 - ratio) * cy
    }
    scale.value = newScale
    isZoomed.value = scale.value > 1
    prevOffsetX.value = offsetX.value
    prevOffsetY.value = offsetY.value
}

function onKeyDown(e: KeyboardEvent) {
    if (!modelValue.value) return
    if (e.key === 'Escape') close()
}

onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown)
})

watch(() => props.src, () => resetTransform())
</script>

<style scoped>
.photo-modal-enter-active,
.photo-modal-leave-active {
    transition: opacity 200ms ease, transform 200ms ease;
}
.photo-modal-enter-from,
.photo-modal-leave-to {
    opacity: 0;
    transform: scale(0.98);
}
.photo-modal-enter-to,
.photo-modal-leave-from {
    opacity: 1;
    transform: scale(1);
}
.cursor-grab {
    cursor: grab;
}
.cursor-grab:active {
    cursor: grabbing;
}
.cursor-zoom-in {
    cursor: zoom-in;
}
.cursor-zoom-out {
    cursor: zoom-out;
}
</style>