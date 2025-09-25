// /extensions/FontColor.ts
// Mark that stores the text color. Uses inline style + data attribute.
// Plays nice with other marks (excludes: '') and provides typed commands.

import { Mark, mergeAttributes, type CommandProps } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontColor: {
      setFontColor: (color?: string | null) => ReturnType
      unsetFontColor: () => ReturnType
    }
  }
}

const FontColor = Mark.create({
  name: 'fontColor',
  group: 'inline',
  inline: true,
  excludes: '',

  addAttributes() {
    return {
      color: {
        default: null as string | null,
        renderHTML: attrs =>
          attrs.color
            ? { style: `color: ${attrs.color}`, 'data-color': String(attrs.color) }
            : {},
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-color') || (el.style && el.style.color) || null,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-color]' }, { style: 'color' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setFontColor:
        (color?: string | null) =>
        ({ chain }: CommandProps) =>
          color ? chain().setMark(this.name, { color }).run() : chain().unsetMark(this.name).run(),

      unsetFontColor:
        () =>
        ({ chain }: CommandProps) =>
          chain().unsetMark(this.name).run(),
    }
  },
})

export default FontColor
