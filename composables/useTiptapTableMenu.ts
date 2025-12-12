// composables/useTiptapTableMenu.ts
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type Ref,
} from 'vue'
import type { Editor } from '@tiptap/vue-3'

/**
 * Accept the same shape as useEditor(): ShallowRef<Editor | undefined>
 * plus null if you ever use that.
 */
export function useTiptapTableMenu(
  editor: Ref<Editor | null | undefined>,
) {
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
    editor.value
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run()

    tableOpen.value = false
    hover.value = { rows: 0, cols: 0 }
  }

  function cmd(name: string) {
    const chain = editor.value?.chain().focus()
    // tiptap chain methods are dynamic
    // @ts-ignore
    chain?.[name]().run()
    tableOpen.value = false
  }

  function onDocClick(e: MouseEvent) {
    if (!tableOpen.value) return
    const el = tableMenuRef.value
    if (!el) return
    if (!el.contains(e.target as Node)) tableOpen.value = false
  }

  onMounted(() => document.addEventListener('click', onDocClick))
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

  return {
    tableOpen,
    tableMenuRef,
    GRID,
    hover,
    gridCells,
    pickTable,
    cmd,
  }
}
