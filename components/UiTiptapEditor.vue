<!-- components/UiTiptapEditor.vue -->
<template>
  <div>
    <!-- Toolbar -->
    <div v-if="editing" class="mb-4 flex flex-wrap items-center gap-2">
      <!-- Font Size -->
      <select class="select select-bordered h-9 min-w-[120px]" @change="onFontSizeChange">
        <option disabled selected>Font Size</option>
        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}</option>
      </select>

      <!-- Font Family -->
      <select class="select select-bordered h-9 min-w-[160px]" @change="onFontFamilyChange">
        <option disabled selected>Font</option>
        <option value="Arial">Arial</option>
        <option value="'Times New Roman'">Times New Roman</option>
        <option value="Georgia">Georgia</option>
        <option value="'Courier New'">Courier New</option>
        <option value="Roboto">Roboto</option>
      </select>

      <!-- Color Palette -->
      <div class="relative group">
        <button type="button" class="btn btn-sm bg-white border" title="Text Color">
          <div class="h-4 w-4 rounded" :style="{ backgroundColor: selectedColor }"></div>
        </button>
        <div class="absolute z-50 hidden group-hover:flex flex-wrap gap-1 p-2 bg-white border rounded shadow w-56">
          <button
            type="button"
            v-for="color in presetColors"
            :key="color"
            class="h-5 w-5 rounded border"
            :style="{ backgroundColor: color }"
            @click="onColorPick(color)"
          />
        </div>
      </div>

      <!-- Inline / block controls -->
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().toggleCustomBold().run()">
        <LucideBold class="h-4 w-4" />
      </button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().toggleItalic().run()">
        <LucideItalic class="h-4 w-4" />
      </button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().toggleUnderline().run()">
        <LucideUnderline class="h-4 w-4" />
      </button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()">H3</button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().toggleBulletList().run()"><LucideList class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().toggleOrderedList().run()"><LucideListOrdered class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().setTextAlign('left').run()"><LucideAlignLeft class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().setTextAlign('center').run()"><LucideAlignCenter class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().setTextAlign('right').run()"><LucideAlignRight class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().setTextAlign('justify').run()"><LucideAlignJustify class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="addLink"><LucideLink class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="triggerImageUpload"><LucideImage class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().undo().run()"><LucideUndo class="h-4 w-4" /></button>
      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().redo().run()"><LucideRedo class="h-4 w-4" /></button>

      <!-- ── Table controls (dropdown) ───────────────────────────────────── -->
      <span class="mx-1 h-6 w-px bg-gray-300"></span>

      <div ref="tableMenuRef" class="relative" @keydown.escape="tableOpen = false">
        <!-- Toggle -->
        <button
          type="button"
          class="btn btn-sm"
          @click.stop="tableOpen = !tableOpen"
          aria-haspopup="menu"
          :aria-expanded="tableOpen"
        >
          Table ▾
        </button>

        <!-- Menu -->
        <div
          v-if="tableOpen"
          class="absolute right-0 z-50 mt-2 w-72 rounded border bg-white p-3 shadow"
          role="menu"
        >
          <!-- Quick size picker -->
          <div class="mb-2">
            <div class="mb-1 text-xs text-gray-500">
              {{ hover.rows || 0 }} × {{ hover.cols || 0 }}
            </div>
            <div
              class="grid gap-1"
              :style="{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }"
            >
              <button
                v-for="cell in gridCells"
                :key="`${cell.r}-${cell.c}`"
                type="button"
                class="h-5 w-5 rounded border"
                :class="cell.r <= hover.rows && cell.c <= hover.cols
                  ? 'bg-gray-200 border-gray-400'
                  : 'bg-white border-gray-300'"
                @mouseenter="hover = { rows: cell.r, cols: cell.c }"
                @click="pickTable(cell.r, cell.c)"
              />
            </div>
          </div>

          <div class="my-2 h-px bg-gray-200"></div>

          <!-- Row/Column/Cell actions -->
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="btn btn-xs" @click="cmd('addRowBefore')">+ Row ↑</button>
            <button type="button" class="btn btn-xs" @click="cmd('addRowAfter')">+ Row ↓</button>
            <button type="button" class="btn btn-xs" @click="cmd('deleteRow')">Del Row</button>

            <button type="button" class="btn btn-xs" @click="cmd('addColumnBefore')">+ Col ◀</button>
            <button type="button" class="btn btn-xs" @click="cmd('addColumnAfter')">+ Col ▶</button>
            <button type="button" class="btn btn-xs" @click="cmd('deleteColumn')">Del Col</button>

            <button type="button" class="btn btn-xs" @click="cmd('toggleHeaderRow')">Header row</button>
            <button type="button" class="btn btn-xs" @click="cmd('toggleHeaderColumn')">Header col</button>
            <button type="button" class="btn btn-xs" @click="cmd('mergeCells')">Merge</button>
            <button type="button" class="btn btn-xs" @click="cmd('splitCell')">Split</button>

            <button type="button" class="btn btn-xs btn-error text-white col-span-2" @click="cmd('deleteTable')">
              Delete table
            </button>
          </div>
        </div>
      </div>
      <!-- ────────────────────────────────────────────────────────────────── -->
    </div>

    <!-- Editor -->
    <EditorContent
      :editor="editor"
      class="w-full max-w-none rounded border border-gray-300 bg-white p-4 shadow overflow-auto"
      style="max-height: 800px; min-height: 300px"
    />

    <input ref="imageInput" type="file" class="hidden" @change="insertImages" accept="image/*" multiple />
  </div>
</template>

<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import ResizeImage from 'tiptap-extension-resize-image'
import Underline from '@tiptap/extension-underline'
import FontFamily from '@tiptap/extension-font-family'
import { CustomBold } from '@/extensions/CustomBold'
import FontSize, { FONT_SIZE_VALUES, isFontSizeValue } from '@/extensions/FontSize'
import type { FontSizeValue } from '@/extensions/FontSize'

/* ✅ Tables */
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

import {
  LucideBold, LucideItalic, LucideUnderline, LucideList, LucideListOrdered,
  LucideAlignLeft, LucideAlignCenter, LucideAlignRight, LucideAlignJustify,
  LucideLink, LucideImage, LucideUndo, LucideRedo,
} from 'lucide-vue-next'
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useFirebaseStorage } from 'vuefire'
import { uploadBytes, getDownloadURL, ref as storageRef } from 'firebase/storage'

const props = defineProps<{ modelValue: string; editing: boolean }>()
const emit = defineEmits(['update:modelValue'])

const imageInput = ref<HTMLInputElement | null>(null)
const storage = useFirebaseStorage()

const fontSizes: FontSizeValue[] = [...FONT_SIZE_VALUES]
const selectedColor = ref('#000000')
const presetColors = [
  '#000000', '#808080', '#FFFFFF', '#FF0000', '#FFA500', '#FFFF00',
  '#008000', '#00FFFF', '#0000FF', '#800080', '#FFC0CB', '#A52A2A',
  '#B0E0E6', '#ADD8E6', '#90EE90', '#D3D3D3', '#FF69B4', '#9932CC',
]

/* Table dropdown state */
const tableOpen = ref(false)
const tableMenuRef = ref<HTMLElement | null>(null)
const GRID = 8
const hover = ref({ rows: 0, cols: 0 })
const gridCells = computed(() =>
  Array.from({ length: GRID * GRID }, (_, i) => ({
    r: Math.floor(i / GRID) + 1,
    c: (i % GRID) + 1,
  })),
)

function pickTable(rows: number, cols: number) {
  editor.value?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  tableOpen.value = false
  hover.value = { rows: 0, cols: 0 }
}

function cmd(name: string) {
  const c = editor.value?.chain().focus()
  // @ts-ignore tiptap chain has these symbol-named methods at runtime
  c?.[name]().run()
  tableOpen.value = false
}

/* Click-outside to close the dropdown */
function onDocClick(e: MouseEvent) {
  if (!tableOpen.value) return
  const el = tableMenuRef.value
  if (!el) return
  if (!el.contains(e.target as Node)) tableOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

/* Convert legacy inline font-size -> fs-* (client-only) */
function convertInlineFontSizesToClasses(html: string): string {
  if (typeof window === 'undefined' || !html) return html
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    doc.body.querySelectorAll<HTMLElement>('[style*="font-size"]').forEach((el) => {
      const styleAttr = el.getAttribute('style') || ''
      const match = styleAttr.match(/font-size:\s*(\d+)px/i)
      if (!match) return
      const px = match[1]
      const size = `${px}px`
      if (!isFontSizeValue(size)) return

      const newStyle = styleAttr.replace(/font-size:\s*\d+px;?\s*/i, '').trim()
      if (newStyle) el.setAttribute('style', newStyle)
      else el.removeAttribute('style')

      el.classList.add(`fs-${px}`)
      el.setAttribute('data-fs', size)
    })

    return doc.body.innerHTML
  } catch {
    return html
  }
}

const editor = useEditor({
  editable: props.editing,
  content: convertInlineFontSizesToClasses(props.modelValue || '<p></p>'),
  extensions: [
    StarterKit.configure({ bold: false }), // using CustomBold
    TextStyle,
    FontSize,
    FontFamily.configure({ types: ['textStyle'] }),
    Color.configure({ types: ['textStyle', 'customBold'] }),
    CustomBold,
    Underline,
    Link,
    Image,
    ResizeImage.configure({ allowBase64: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),

    /* Tables */
    Table.configure({ resizable: true, lastColumnResizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  onUpdate: ({ editor }) => emit('update:modelValue', editor.getHTML()),
  editorProps: {
    transformPastedHTML: (html) => convertInlineFontSizesToClasses(html),
  },
})

watch(() => props.editing, (val) => editor.value?.setEditable(val))
watch(
  () => props.modelValue,
  (val) => {
    const normalized = convertInlineFontSizesToClasses(val || '<p></p>')
    const current = editor.value?.getHTML()
    if (editor.value && normalized !== current) {
      editor.value.commands.setContent(normalized, false)
    }
  },
)

/* Font / color handlers */
function onFontSizeChange(event: Event) {
  const raw = (event.target as HTMLSelectElement).value
  if (!isFontSizeValue(raw)) return
  editor.value
    ?.chain()
    .focus()
    .extendMarkRange('fontSize')
    .unsetFontSize()
    .setFontSize(raw)
    .run()
}

function onFontFamilyChange(event: Event) {
  const font = (event.target as HTMLSelectElement).value
  editor.value
    ?.chain()
    .focus()
    .extendMarkRange('textStyle')
    .setFontFamily(font)
    .run()
}

function onColorPick(color: string) {
  selectedColor.value = color
  editor.value
    ?.chain()
    .focus()
    .extendMarkRange('textStyle')
    .setColor(color)
    .run()
}

/* Links & images */
function addLink() {
  const url = prompt('Enter URL:')
  if (!url) return
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function triggerImageUpload() {
  imageInput.value?.click()
}

async function insertImages(e: Event) {
  const files = (e.target as HTMLInputElement)?.files
  if (!files || files.length === 0) return
  const ed = editor.value
  if (!ed) return

  for (const file of Array.from(files)) {
    const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const path = `editor_images/${uniqueId}-${file.name}`
    const refObj = storageRef(storage, path)
    await uploadBytes(refObj, file)
    const url = await getDownloadURL(refObj)

    ed.commands.focus('end')
    ed.commands.insertContent([
      { type: 'paragraph' },
      { type: 'image', attrs: { src: url } },
      { type: 'paragraph' },
    ])
  }

  if (imageInput.value) imageInput.value.value = ''
}
</script>

<style scoped>
/* Editor base */
:deep(.ProseMirror) { min-height: 300px; }

:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem 0;
}

/* Headings in editor */
:deep(.ProseMirror h1),
:deep(.ProseMirror h2),
:deep(.ProseMirror h3) {
  color: var(--cet-heading) !important;
  font-family: var(--cet-heading-font) !important;
}

/* fs-* sizes */
:deep(.ProseMirror .fs-12) { font-size: clamp(12px, 2.8vw, 12px) !important; }
:deep(.ProseMirror .fs-14) { font-size: clamp(13px, 3.2vw, 14px) !important; }
:deep(.ProseMirror .fs-16) { font-size: clamp(14px, 3.6vw, 16px) !important; }
:deep(.ProseMirror .fs-18) { font-size: clamp(16px, 4.0vw, 18px) !important; }
:deep(.ProseMirror .fs-24) { font-size: clamp(18px, 5.5vw, 24px) !important; }
:deep(.ProseMirror .fs-32) { font-size: clamp(22px, 7.4vw, 32px) !important; }
:deep(.ProseMirror .fs-48) { font-size: clamp(28px, 10.5vw, 48px) !important; }

/* Links pointer inside editor */
:deep(.ProseMirror a) { cursor: pointer; }

/* ✅ Table look while editing */
:deep(.ProseMirror table){ width:100%; border-collapse:collapse; }
:deep(.ProseMirror th),
:deep(.ProseMirror td){
  position: relative;           /* keep resizer + any overlays scoped to the cell */
  border:1px solid #d1d5db;
  padding:6px 8px;
  vertical-align:top;
}
:deep(.ProseMirror thead th){ background:#f3f4f6; font-weight:700; text-align:left; }
:deep(.ProseMirror .column-resize-handle){
  position:absolute; right:-2px; top:0; bottom:0; width:3px; background:rgba(0,0,0,.15); pointer-events:none;
}

/* ❌ Remove the extra blue overlay for table cell selections */
:deep(.ProseMirror .selectedCell:after){ content:none; }

/* 🔵 Make browser text selection less intense inside the editor */
:deep(.ProseMirror ::selection){ background: rgba(160, 195, 255, .28); }


/* --- Fix: don't tint entire cells when selecting text --- */
:deep(.ProseMirror .selectedCell) {
  background: transparent !important;           /* no blue fill on cells */
}
:deep(.ProseMirror .selectedCell)::after {
  content: none !important;                      /* remove overlay pseudo element */
  display: none !important;
}

/* Optional: if you still want a hint when doing a REAL cell selection,
   use a thin outline instead of a full fill. Comment out if not wanted. */
:deep(.ProseMirror .cell-selection .selectedCell) {
  box-shadow: inset 0 0 0 2px #60a5fa;          /* visible outline only */
}


</style>
