//CustomBold.ts
import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customBold: {
      toggleCustomBold: () => ReturnType
    }
  }
}

export const CustomBold = Mark.create({
  name: 'customBold',

  addAttributes() {
    return {
      fontWeight: {
        default: 'bold',
        renderHTML: attributes => {
          return {
            style: `font-weight: ${attributes.fontWeight}`
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'strong',
      },
      {
        tag: 'b',
        getAttrs: node => (node as HTMLElement).style.fontWeight !== 'normal' && null,
      },
      {
        style: 'font-weight',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      toggleCustomBold:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleCustomBold(), // Ctrl+B or Cmd+B
    }
  },
})
