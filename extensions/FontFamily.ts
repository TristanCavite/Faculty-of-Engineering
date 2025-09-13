// /extensions/FontFamily.ts
// Custom font-family mark that matches the official command signatures
// so TypeScript declaration merging doesn't error.

import { Mark, mergeAttributes, type CommandProps } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    // MUST match the upstream declaration exactly
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType
      unsetFontFamily: () => ReturnType
    }
  }
}

const FontFamily = Mark.create({
  name: 'fontFamily',
  group: 'inline',
  inline: true,
  excludes: '',

  addAttributes() {
    return {
      family: {
        default: null as string | null,
        renderHTML: attrs =>
          attrs.family
            ? { style: `font-family: ${attrs.family}`, 'data-ff': String(attrs.family) }
            : {},
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-ff') || (el.style && el.style.fontFamily) || null,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-ff]' }, { style: 'font-family' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }: CommandProps) =>
          chain().setMark(this.name, { family: fontFamily }).run(),

      unsetFontFamily:
        () =>
        ({ chain }: CommandProps) =>
          chain().unsetMark(this.name).run(),
    }
  },
})

export default FontFamily
