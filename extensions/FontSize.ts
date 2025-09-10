// /extensions/FontSize.ts
// Class-based Font Size mark for TipTap
// - Writes class="fs-24" + data-fs="24px" (no inline styles)
// - Allows coexistence with other marks (bold, color, etc.) via `excludes: ''`
// - Parses legacy style="font-size: 24px" so old content still renders
// - Exports a type guard to keep UI code strictly typed

import { Mark, mergeAttributes } from '@tiptap/core'

/** Keep in sync with your toolbar options */
export const FONT_SIZE_VALUES = ['12px', '14px', '16px', '18px', '24px', '32px', '48px'] as const
export type FontSizeValue = typeof FONT_SIZE_VALUES[number]

/** TS type guard for narrowing arbitrary strings */
export function isFontSizeValue(s: string): s is FontSizeValue {
  return (FONT_SIZE_VALUES as readonly string[]).includes(s)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /** Apply one of the allowed sizes (e.g., '24px'). */
      setFontSize: (size: FontSizeValue) => ReturnType
      /** Remove the font size mark. */
      unsetFontSize: () => ReturnType
    }
  }
}

export const FontSize = Mark.create({
  name: 'fontSize',
  group: 'inline',
  inline: true,

  // ✅ Important: don't exclude other marks; let font size mix with bold, color, link, etc.
  excludes: '',

  addAttributes() {
    return {
      size: {
        default: null as FontSizeValue | null,

        // Render as class + data attribute (no inline style)
        renderHTML: (attrs: { size?: FontSizeValue | null }) => {
          const size = attrs.size ?? null
          if (!size) return {}
          const numeric = String(size).replace(/[^0-9]/g, '') // "24px" -> "24"
          return {
            class: `fs-${numeric}`,
            'data-fs': size,
          }
        },

        // Parse from data-fs, class, or legacy inline style="font-size: XXpx"
        parseHTML: (el: HTMLElement) => {
          const ds = el.getAttribute('data-fs')
          if (ds && isFontSizeValue(ds)) return ds

          const cls = el.getAttribute('class') || ''
          const m = cls.match(/\bfs-(12|14|16|18|24|32|48)\b/)
          if (m) return `${m[1]}px` as FontSizeValue

          const styleVal = (el.style && el.style.fontSize) || ''
          if (styleVal && isFontSizeValue(styleVal)) return styleVal

          return null
        },
      },
    }
  },

  // Let TipTap discover this mark in raw HTML
  parseHTML() {
    return [
      { tag: 'span[data-fs]' },
      { tag: 'span[class*="fs-"]' },
      { style: 'font-size' }, // legacy fallback
    ]
  },

  // Render wrapper
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  // Commands used by your toolbar
  addCommands() {
    return {
      setFontSize:
        (size: FontSizeValue) =>
        ({ chain }) =>
          chain().setMark(this.name, { size }).run(),

      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    }
  },
})

export default FontSize
