<!-- components/UiTiptapEditor.vue -->
<template>
  <div>
    <!-- Toolbar -->
    <div v-if="editing" class="mb-4 flex flex-wrap items-center gap-2">
      <!-- Font Size -->
      <select class="select select-bordered h-9 min-w-[120px]" @change="onFontSizeChange">
        <option disabled selected>Font Size</option>
        <option v-for="size in fontSizes" :key="size" :value="size">
          {{ size }}
        </option>
      </select>

      <!-- (Font family dropdown removed) -->

      <!-- Inline / block controls -->
      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().toggleCustomBold().run()"
      >
        <LucideBold class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <LucideItalic class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <LucideUnderline class="h-4 w-4" />
      </button>

      <!-- Headings (H2 / H3) -->
      <button type="button" class="btn btn-sm" @click="setHeading(2)">
        H2
      </button>
      <button type="button" class="btn btn-sm" @click="setHeading(3)">
        H3
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <LucideList class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <LucideListOrdered class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().setTextAlign('left').run()"
      >
        <LucideAlignLeft class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().setTextAlign('center').run()"
      >
        <LucideAlignCenter class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().setTextAlign('right').run()"
      >
        <LucideAlignRight class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="btn btn-sm"
        @click="editor?.chain().focus().setTextAlign('justify').run()"
      >
        <LucideAlignJustify class="h-4 w-4" />
      </button>

      <button type="button" class="btn btn-sm" @click="addLink">
        <LucideLink class="h-4 w-4" />
      </button>

      <button type="button" class="btn btn-sm" @click="triggerImageUpload">
        <LucideImage class="h-4 w-4" />
      </button>

      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().undo().run()">
        <LucideUndo class="h-4 w-4" />
      </button>

      <button type="button" class="btn btn-sm" @click="editor?.chain().focus().redo().run()">
        <LucideRedo class="h-4 w-4" />
      </button>

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
                :class="
                  cell.r <= hover.rows && cell.c <= hover.cols
                    ? 'border-gray-400 bg-gray-200'
                    : 'border-gray-300 bg-white'
                "
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

            <button type="button" class="btn btn-xs" @click="cmd('addColumnBefore')">
              + Col ◀
            </button>
            <button type="button" class="btn btn-xs" @click="cmd('addColumnAfter')">
              + Col ▶
            </button>
            <button type="button" class="btn btn-xs" @click="cmd('deleteColumn')">Del Col</button>

            <button type="button" class="btn btn-xs" @click="cmd('toggleHeaderRow')">
              Header row
            </button>
            <button type="button" class="btn btn-xs" @click="cmd('toggleHeaderColumn')">
              Header col
            </button>
            <button type="button" class="btn btn-xs" @click="cmd('mergeCells')">Merge</button>
            <button type="button" class="btn btn-xs" @click="cmd('splitCell')">Split</button>

            <button
              type="button"
              class="btn btn-xs btn-error col-span-2 text-white"
              @click="cmd('deleteTable')"
            >
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
      class="not-prose w-full max-w-none overflow-auto rounded border border-gray-300 bg-white p-4 shadow text-black"
      style="max-height: 800px; min-height: 300px"
    />

    <input
      ref="imageInput"
      type="file"
      class="hidden"
      @change="insertImages"
      accept="image/*"
      multiple
    />
  </div>
</template>

<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import {
  LucideAlignCenter,
  LucideAlignJustify,
  LucideAlignLeft,
  LucideAlignRight,
  LucideBold,
  LucideImage,
  LucideItalic,
  LucideLink,
  LucideList,
  LucideListOrdered,
  LucideRedo,
  LucideUnderline,
  LucideUndo,
} from 'lucide-vue-next'
import type { UseUiTiptapEditorProps, UseUiTiptapEditorEmit } from '@/composables/useUiTiptapEditor'
import { useTiptapTableMenu } from '@/composables/useTiptapTableMenu'

const props = defineProps<UseUiTiptapEditorProps>()
const emit = defineEmits<UseUiTiptapEditorEmit>()

// Nuxt auto-imports composables from /composables
const {
  editor,
  imageInput,
  fontSizes,
  onFontSizeChange,
  setHeading,
  addLink,
  triggerImageUpload,
  insertImages,
} = useUiTiptapEditor(props, emit)

const { tableOpen, tableMenuRef, GRID, hover, gridCells, pickTable, cmd } =
  useTiptapTableMenu(editor)
</script>

<style scoped>
/* ─── Editor base ─────────────────────────────────────────────── */
:deep(.ProseMirror) {
  min-height: 300px;
  color: #111827; /* default body text */
  font-family: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Images */
:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem 0;
}

/* Font-size utility classes from FontSize mark */
:deep(.ProseMirror .fs-12) { font-size: clamp(12px, 2.8vw, 12px) !important; }
:deep(.ProseMirror .fs-14) { font-size: clamp(13px, 3.2vw, 14px) !important; }
:deep(.ProseMirror .fs-16) { font-size: clamp(14px, 3.6vw, 16px) !important; }
:deep(.ProseMirror .fs-18) { font-size: clamp(16px, 4vw, 18px) !important; }
:deep(.ProseMirror .fs-24) { font-size: clamp(18px, 5.5vw, 24px) !important; }
:deep(.ProseMirror .fs-32) { font-size: clamp(22px, 7.4vw, 32px) !important; }
:deep(.ProseMirror .fs-48) { font-size: clamp(28px, 10.5vw, 48px) !important; }

/* Links pointer inside editor */
:deep(.ProseMirror a) {
  cursor: pointer;
}

/* ─── Spacing like Tailwind Typography (.prose) ─── */
:deep(.ProseMirror p,
      .ProseMirror ul,
      .ProseMirror ol,
      .ProseMirror pre,
      .ProseMirror table,
      .ProseMirror blockquote) {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  line-height: 1.75;
}

/* Block spacing & sizes for headings */
:deep(.ProseMirror h1) {
  margin-top: 0;
  margin-bottom: 0.888889em;
}

/* H2: larger, primary section heading */
:deep(.ProseMirror h2) {
  margin-top: 2em;
  margin-bottom: 1em;
  font-size: clamp(22px, 2.4vw, 26px);
  font-weight: 700;
}

/* H3: smaller sub-heading under H2 */
:deep(.ProseMirror h3) {
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 600;
}

/* Headings = maroon + Montserrat */
:deep(.ProseMirror h1),
:deep(.ProseMirror h2),
:deep(.ProseMirror h3) {
  color: #7f1d1d !important; /* maroon / red-900 */
  font-family: 'Montserrat', system-ui, sans-serif;
}

/* Lists */
:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  list-style-position: outside;
  padding-left: 1.5rem;
}

:deep(.ProseMirror ul) { list-style-type: disc; }
:deep(.ProseMirror ol) { list-style-type: decimal; }

:deep(.ProseMirror ul ul) { list-style-type: circle; }
:deep(.ProseMirror ul ul ul) { list-style-type: square; }

:deep(.ProseMirror li) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

:deep(.ProseMirror li > p) {
  margin: 0.25em 0;
}

/* ─── Tables (editing look) ───────────────────────────────────── */
:deep(.ProseMirror table) {
  width: 100%;
  border-collapse: collapse;
}
:deep(.ProseMirror th),
:deep(.ProseMirror td) {
  position: relative;
  border: 1px solid #d1d5db;
  padding: 6px 8px;
  vertical-align: top;
}
:deep(.ProseMirror thead th) {
  background: #f3f4f6;
  font-weight: 700;
  text-align: left;
}
:deep(.ProseMirror .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

/* Selection tweaks */
:deep(.ProseMirror .selectedCell:after) {
  content: none;
}
:deep(.ProseMirror ::selection) {
  background: rgba(160, 195, 255, 0.28);
}
:deep(.ProseMirror .selectedCell) {
  background: transparent !important;
}
:deep(.ProseMirror .selectedCell)::after {
  content: none !important;
  display: none !important;
}
:deep(.ProseMirror .cell-selection .selectedCell) {
  box-shadow: inset 0 0 0 2px #60a5fa;
}
</style>
