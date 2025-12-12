// composables/useUiTiptapEditor.ts
import { ref, watch } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import ResizeImage from 'tiptap-extension-resize-image'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { useFirebaseStorage } from 'vuefire'

import FontSize, {
  FONT_SIZE_VALUES,
  isFontSizeValue,
  type FontSizeValue,
} from '@/extensions/FontSize'
import { CustomBold } from '@/extensions/CustomBold'

export interface UseUiTiptapEditorProps {
  modelValue: string
  editing: boolean
}

export type UseUiTiptapEditorEmit = (e: 'update:modelValue', value: string) => void

// Convert old inline font-size styles to fs-* classes (so our FontSize mark can use them)
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

export function useUiTiptapEditor(
  props: UseUiTiptapEditorProps,
  emit: UseUiTiptapEditorEmit,
) {
  const storage = useFirebaseStorage()
  const imageInput = ref<HTMLInputElement | null>(null)

  const fontSizes: FontSizeValue[] = [...FONT_SIZE_VALUES]

  const editor = useEditor({
    editable: props.editing,
    content: convertInlineFontSizesToClasses(props.modelValue || '<p></p>'),
    extensions: [
      StarterKit.configure({ bold: false }), // use CustomBold instead
      FontSize,
      CustomBold,
      Underline,
      Link,
      Image,
      ResizeImage.configure({ allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),

      // Tables
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

  // React to `editing` prop
  watch(
    () => props.editing,
    (val) => editor.value?.setEditable(val),
  )

  // Keep external v-model in sync
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

  // Font size dropdown
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

  // Headings (clear fontSize mark first)
  function setHeading(level: 2 | 3) {
    const chain = editor.value?.chain().focus()
    if (!chain) return

    chain
      .extendMarkRange('fontSize')
      .unsetFontSize()
      .toggleHeading({ level })
      .run()
  }

  // Links
  function addLink() {
    const url = window.prompt('Enter URL:')
    if (!url) return
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  // Images
  function triggerImageUpload() {
    imageInput.value?.click()
  }

  async function insertImages(e: Event) {
    const files = (e.target as HTMLInputElement)?.files
    if (!files || files.length === 0) return
    const ed = editor.value
    if (!ed) return

    for (const file of Array.from(files)) {
      const uniqueId =
        crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
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

  return {
    editor,
    imageInput,
    fontSizes,
    onFontSizeChange,
    setHeading,
    addLink,
    triggerImageUpload,
    insertImages,
  }
}
