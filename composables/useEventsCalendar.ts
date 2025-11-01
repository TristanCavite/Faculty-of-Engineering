// /composables/useEventsCalendar.ts
// Nuxt 3 + Vue 3 + TypeScript
import { computed, nextTick, ref, type Ref } from 'vue'
import { isSameDay } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

/** Shape of an event doc your pages pass in. */
export interface EventRecord {
  id: string
  title?: string
  date: Date | string | number | Timestamp
  dateEnd?: Date | string | number | Timestamp
  createdAt?: Date | string | number | Timestamp
  eventType?: string
  // ...any other fields your UI needs
  [key: string]: any
}

interface UseEventsCalendarOptions {
  /** Element to scroll to after picking a date (e.g., "events-list"). */
  scrollTargetId?: string
}

/**
 * Centralized calendar logic used by the Home/Events pages.
 * Pass a reactive ref of events (already fetched) and reuse everywhere.
 */
export function useEventsCalendar(
  events: Ref<EventRecord[]>,
  opts: UseEventsCalendarOptions = {}
) {
  // --- state
  const selectedDate = ref<Date | null>(null)

  // --- utils
  const asDate = (val: any): Date | null => {
    if (!val) return null
    if (val instanceof Date) return val
    if (typeof val?.toDate === 'function') return val.toDate() as Date // Firestore Timestamp
    if (typeof val === 'string' || typeof val === 'number') return new Date(val)
    return null
  }

  const msFrom = (val: any): number => {
    if (!val) return 0
    if (typeof val === 'string') return +new Date(val)
    if (val instanceof Date) return +val
    if (typeof val?.toMillis === 'function') return val.toMillis() as number // Firestore Timestamp
    if (typeof val?.toDate === 'function') return +(val.toDate() as Date)
    return 0
  }

  const inDayRange = (e: EventRecord, day: Date): boolean => {
    const s = asDate(e.date)
    if (!s) return false

    // normalize to whole-day comparisons
    const d0 = new Date(day); d0.setHours(0, 0, 0, 0)
    const s0 = new Date(s);  s0.setHours(0, 0, 0, 0)

    const maybeEnd = asDate(e.dateEnd)
    if (maybeEnd) {
      const e0 = new Date(maybeEnd)
      e0.setHours(23, 59, 59, 999) // inclusive end
      return d0 >= s0 && d0 <= e0
    }
    // single-day event
    return d0.getTime() === s0.getTime()
  }

  // --- calendar attributes (ranges for multi-day, dots for single-day)
  const calendarAttributes = computed(() => {
    const attrs: any[] = []
    for (const e of events.value) {
      const start = asDate(e.date)
      const end = asDate(e.dateEnd)
      if (!start) continue

      if (end && end > start) {
        attrs.push({
          key: `range-${e.id}`,
          highlight: true,
          dates: { start, end },
          popover: { label: e.title || 'Event' },
        })
      } else {
        attrs.push({
          key: `dot-${e.id}-${+start}`,
          dates: start,
          dot: true,
          popover: { label: e.title || 'Event' },
        })
      }
    }
    return attrs
  })

  // --- date click handler (toggle if same day, then smooth-scroll)
  const handleDayClick = (d: Date) => {
    if (selectedDate.value && isSameDay(selectedDate.value, d)) {
      selectedDate.value = null
    } else {
      selectedDate.value = d
    }

    if (opts.scrollTargetId) {
      nextTick(() => {
        document.getElementById(opts.scrollTargetId!)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    }
  }

  // --- helpers you already use in your cards/lists
  const formatEventDate = (start: any, end?: any): string => {
    if (!start) return ''
    const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
    const s = new Date(asDate(start)!).toLocaleDateString('en-US', opts)
    if (end) {
      const e = new Date(asDate(end)!).toLocaleDateString('en-US', opts)
      return `${s} - ${e}`
    }
    return s
  }

  const formatPublishDate = (val: any): string => {
    if (!val) return ''
    const d = asDate(val)!
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const miniDate = (val: any): string => {
    const d = asDate(val)!
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  /**
   * Apply the current date filter to a list (used after your type filter).
   * Keeps chaining simple in computed() on the page.
   */
  const bySelectedDate = <T extends EventRecord>(list: T[]): T[] => {
    if (!selectedDate.value) return list
    const day = selectedDate.value
    return list.filter((e) => inDayRange(e, day))
  }

  return {
    // state
    selectedDate,

    // core calendar bits
    calendarAttributes,
    handleDayClick,

    // predicates & utils
    inDayRange,
    asDate,
    msFrom,

    // UI helpers
    formatEventDate,
    formatPublishDate,
    miniDate,
    bySelectedDate,
  }
}
