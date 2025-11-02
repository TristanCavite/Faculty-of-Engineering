import { computed, type Ref } from 'vue'

export type SearchMatcher<T> = (item: T, normalizedQuery: string) => boolean

export function normalize(input: unknown): string {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripHtml(html: unknown): string {
  return String(html ?? '').replace(/<[^>]*>/g, ' ')
}

export function buildKeyMatcher<T extends Record<string, any>>(keys: (keyof T | string)[]) {
  return (item: T, q: string) => {
    const tokens = q.split(' ').filter(Boolean)
    if (!tokens.length) return true

    const hay = normalize(
      keys.map((k) => {
        const v = (item as any)[k as string]
        if (Array.isArray(v)) return v.map(x => normalize(stripHtml(x))).join(' ')
        return normalize(stripHtml(v))
      }).join(' ')
    )

    return tokens.every(t => hay.includes(t))
  }
}

export function useSearch<T>(source: Ref<T[]>, query: Ref<string>, matcher: SearchMatcher<T>) {
  return computed(() => {
    const q = normalize(query.value)
    if (!q) return source.value
    return source.value.filter(item => {
      try { return matcher(item, q) } catch { return false }
    })
  })
}
