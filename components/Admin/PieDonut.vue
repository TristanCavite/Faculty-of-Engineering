<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <h2 v-if="title" class="mb-4 text-base font-semibold text-gray-800">{{ title }}</h2>

    <div class="flex flex-wrap items-center gap-6 md:flex-nowrap">
      <!-- Chart wrapper: single pointer handler on the SVG element -->
      <div
        ref="wrapEl"
        class="relative shrink-0"
        :style="{ width: sizePx, height: sizePx }"
        role="img"
        :aria-label="`${title || 'Pie chart'}: total ${formatNumber(total)}`"
      >
        <svg
          ref="svgEl"
          :width="size"
          :height="size"
          :viewBox="`0 0 ${size} ${size}`"
          class="block"
          shape-rendering="geometricPrecision"
          @mousemove="onPointerMove"
          @mouseleave="onPointerLeave"
        >
          <!-- slices: non-interactive (pointer-events none). Hit testing handled on wrapper -->
          <g v-for="(s, i) in slices" :key="`${s.label}-${i}`">
            <path
              :d="s.path"
              :fill="s.color"
              class="transition-opacity duration-200 cursor-default"
              style="pointer-events: none;"
            />
            <text
              v-if="showSlicePercents && s.percent >= minLabelPercent"
              :x="s.labelX"
              :y="s.labelY"
              text-anchor="middle"
              dominant-baseline="middle"
              class="select-none"
              :style="{ fontSize: '12px', fontWeight: 800, fill: labelTextColor(s.color), pointerEvents: 'none' }"
            >
              {{ Math.round(s.percent) }}%
            </text>
          </g>

          <!-- donut hole (non-interactive) -->
          <circle v-if="donut" :cx="c" :cy="c" :r="innerR" fill="white" style="pointer-events:none;" />

          <!-- highlight wedge drawn on top when hovered (non-interactive) -->
          <path
            v-if="hoveredSliceIndex !== -1 && hoverHighlightPath"
            :d="hoverHighlightPath"
            fill="currentColor"
            :style="{ color: hoverColor, opacity: 0.08, pointerEvents: 'none' }"
          />
        </svg>

        <!-- center label (non-interactive) -->
        <div v-if="showCenter && donut" class="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div class="text-[10px] uppercase tracking-widest text-gray-400">{{ centerLabel }}</div>
            <div class="text-3xl font-extrabold text-gray-900">{{ formatNumber(total) }}</div>
          </div>
        </div>

        <!-- tooltip: anchored to slice centroid (not cursor), numeric only -->
        <div
          v-if="tip.show"
          class="pointer-events-none absolute z-50 rounded-md bg-gray-900/95 px-2 py-1 text-xs font-medium text-white shadow-lg"
          :style="{ left: tip.x + 'px', top: tip.y + 'px', transform: 'translate(-50%, -110%)' }"
        >
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-sm" :style="{ backgroundColor: tip.color }"></span>
            <span class="opacity-90">{{ tip.label }}</span>
          </div>
          <div class="mt-0.5 text-[11px]">{{ formatNumber(tip.value) }}</div>
        </div>
      </div>

      <!-- Legend (outside) -->
      <ul v-if="showLegend" class="min-w-[220px] shrink-0 space-y-2">
        <li v-for="(row, i) in mergedRows" :key="row.label" class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="inline-block size-3 rounded-sm" :style="{ backgroundColor: row.color || fallbackColors[i % fallbackColors.length] }" />
            <span class="max-w-[160px] truncate whitespace-nowrap text-sm text-gray-700" :title="row.label">{{ row.label }}</span>
          </div>
          <div class="text-sm font-semibold text-gray-900">
            {{ formatNumber(row.value) }}
            <span v-if="showPercents" class="ml-1 text-gray-500">({{ percentOf(row.value).toFixed(0) }}%)</span>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="!total" class="mt-4 text-sm text-gray-500">No data.</div>
  </div>
</template>

<script setup lang="ts">
/*
  UiPieDonutRolesFixed.vue
  - Hit-test on the SVG wrapper (no per-path mouseenter/leave)
  - Half-open angle containment to avoid boundary collisions
  - Tooltip anchored at slice centroid (mapped to screen coords via getScreenCTM)
  - Duplicate rows merged (sum values, keep first color)
  - On-ring percents + legend remain
*/

import { computed, ref } from 'vue'

type Row = { label: string; value: number; color?: string }

/* ---------- props ---------- */
const props = withDefaults(defineProps<{
  title?: string
  rows?: Row[]
  size?: number
  donut?: boolean
  thickness?: number
  startAngle?: number
  showLegend?: boolean
  showCenter?: boolean
  centerLabel?: string
  showPercents?: boolean
  showSlicePercents?: boolean
  minLabelPercent?: number
}>(), {
  size: 220,
  donut: true,
  thickness: 48,
  startAngle: -90,
  showLegend: true,
  showCenter: true,
  centerLabel: 'TOTAL',
  showPercents: true,
  showSlicePercents: true,
  minLabelPercent: 0,
})

/* ---------- demo fallback rows ---------- */
const demoRows = ref<Row[]>([
  { label: 'Super Admin', value: 1, color: '#0f172a' },
  { label: 'Head Admin', value: 2, color: '#0d9488' },
  { label: 'Faculty', value: 4, color: '#0284c7' },
])

/* ---------- geometry ---------- */
const size = props.size
const sizePx = computed(() => `${size}px`)
const c = computed(() => size / 2)
const r = computed(() => size / 2)
const innerR = computed(() => Math.max(0, props.donut ? r.value - props.thickness : 0))

/* ---------- fallback colors ---------- */
const fallbackColors = ['#111827', '#0d9488', '#0284c7', '#7c3aed', '#f59e0b', '#ef4444']

/* ---------- merge duplicates by label (sum values, keep first color) ---------- */
const mergedRows = computed<Row[]>(() => {
  const source = (props.rows && props.rows.length) ? props.rows : demoRows.value
  const map = new Map<string, Row>()
  for (const rr of source) {
    const label = String(rr.label ?? '').trim()
    if (!map.has(label)) map.set(label, { label, value: Number(rr.value || 0), color: rr.color })
    else {
      const ex = map.get(label)!
      ex.value = Number(ex.value || 0) + Number(rr.value || 0)
    }
  }
  return Array.from(map.values())
})

/* ---------- totals & helpers ---------- */
const total = computed(() => mergedRows.value.reduce((acc, r) => acc + (Number.isFinite(r.value) ? r.value : 0), 0))
function formatNumber(n: number) { try { return n.toLocaleString() } catch { return String(n) } }
function percentOf(v: number) { const t = total.value || 1; return (v / t) * 100 }

/* ---------- polar math & arc helpers ---------- */
function polarToCartesian(cx: number, cy: number, rad: number, angleDeg: number) {
  const angle = (angleDeg - 90) * Math.PI / 180.0
  return { x: cx + rad * Math.cos(angle), y: cy + rad * Math.sin(angle) }
}
function describeArc(cx: number, cy: number, rad: number, start: number, end: number) {
  const startP = polarToCartesian(cx, cy, rad, end)
  const endP = polarToCartesian(cx, cy, rad, start)
  const largeArcFlag = (end - start) <= 180 ? '0' : '1'
  return `M ${startP.x} ${startP.y} A ${rad} ${rad} 0 ${largeArcFlag} 0 ${endP.x} ${endP.y} L ${cx} ${cy} Z`
}
function describeDonutWedge(cx: number, cy: number, outerR: number, innerR: number, start: number, end: number) {
  // robust donut wedge path (outer arc and inner arc back)
  const outerStart = polarToCartesian(cx, cy, outerR, end)
  const outerEnd = polarToCartesian(cx, cy, outerR, start)
  const innerStart = polarToCartesian(cx, cy, innerR, start)
  const innerEnd = polarToCartesian(cx, cy, innerR, end)
  const sweep = ((end - start + 360) % 360)
  const largeArcFlag = sweep <= 180 ? '0' : '1'
  return `M ${outerStart.x} ${outerStart.y} A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y} L ${innerStart.x} ${innerStart.y} A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y} Z`
}
function normalizeAngle(a: number) { return ((a % 360) + 360) % 360 }

/* ---------- slices computed (with start/end angles) ---------- */
type Slice = {
  path: string
  color: string
  value: number
  label: string
  percent: number
  labelX: number
  labelY: number
  startAngle: number
  endAngle: number
}
const slices = computed<Slice[]>(() => {
  const rows = mergedRows.value
  let angle = props.startAngle || -90
  return rows.map((row, i) => {
    const pct = percentOf(row.value)
    const sweep = (pct / 100) * 360
    const next = angle + sweep
    const color = row.color || fallbackColors[i % fallbackColors.length]
    const path = describeArc(c.value, c.value, r.value, angle, next)
    const mid = angle + sweep / 2
    const labelRadius = props.donut ? (innerR.value + r.value) / 2 : r.value * 0.6
    const p = polarToCartesian(c.value, c.value, labelRadius, mid)
    const sl = normalizeAngle(angle), el = normalizeAngle(next)
    angle = next
    return { path, color, value: row.value, label: row.label, percent: pct, labelX: p.x, labelY: p.y, startAngle: sl, endAngle: el }
  })
})

/* ---------- hit-testing state ---------- */
const wrapEl = ref<HTMLElement | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)
const tip = ref<{ show: boolean; x: number; y: number; label: string; value: number; color: string }>({
  show: false, x: 0, y: 0, label: '', value: 0, color: ''
})
const hoveredSliceIndex = ref<number>(-1)
const hoverColor = ref<string>('#000')

/* ---------- compute hover highlight path ---------- */
const hoverHighlightPath = computed(() => {
  const idx = hoveredSliceIndex.value
  if (idx === -1) return ''
  const s = slices.value[idx]
  const outerExp = r.value + 6 // expand a few px for highlight
  return describeDonutWedge(c.value, c.value, outerExp, innerR.value, s.startAngle, s.endAngle)
})

/* ---------- map client coords -> svg user coords robustly ---------- */
function clientToSvgPoint(clientX: number, clientY: number) {
  const svg = svgEl.value
  if (svg && typeof svg.createSVGPoint === 'function' && svg.getScreenCTM) {
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (ctm) {
      const inv = ctm.inverse()
      const transformed = pt.matrixTransform(inv)
      return { x: transformed.x, y: transformed.y }
    }
  }
  // fallback: map client using wrapper rect assuming viewBox is 0 0 size size
  const rect = wrapEl.value?.getBoundingClientRect()
  if (!rect) return null
  const x = ((clientX - rect.left) / rect.width) * size
  const y = ((clientY - rect.top) / rect.height) * size
  return { x, y }
}

/* ---------- robust half-open angle test (prevents boundary collisions) ---------- */
function angleInSlice(a: number, start: number, end: number) {
  const EPS = 1e-6
  if (start <= end) return a + EPS >= start && a < end - EPS
  // wrap-around
  return a + EPS >= start || a < end - EPS
}

/* ---------- pointer handlers ---------- */
function onPointerMove(e: MouseEvent) {
  const svgPt = clientToSvgPoint(e.clientX, e.clientY)
  if (!svgPt) return
  const dx = svgPt.x - c.value
  const dy = svgPt.y - c.value
  const dist = Math.sqrt(dx * dx + dy * dy)

  // outside radial area: hide
  if (dist < innerR.value || dist > r.value) { setHover(-1); return }

  // angle in degrees, normalized with 0 at top (12 o'clock)
  let ang = Math.atan2(dy, dx) * 180 / Math.PI // -180..180
  ang = normalizeAngle(ang + 90)

  const idx = slices.value.findIndex(s => angleInSlice(ang, s.startAngle, s.endAngle))
  if (idx === -1) { setHover(-1); return }

  const s = slices.value[idx]
  setHover(idx, e.clientX, e.clientY, s)
}

function onPointerLeave() { setHover(-1) }

/* ---------- show tooltip anchored to slice centroid (SVG -> screen coords) ---------- */
function setHover(index: number, clientX = 0, clientY = 0, s?: Slice) {
  hoveredSliceIndex.value = index
  if (index === -1 || !s) { tip.value.show = false; return }

  // compute mid-angle, centroid radius and svg coords in user space
  let sweep = (s.endAngle - s.startAngle + 360) % 360
  const midAngle = normalizeAngle(s.startAngle + sweep / 2)
  const centroidRadius = props.donut ? (innerR.value + r.value) / 2 : r.value * 0.5
  const centroidSvg = polarToCartesian(c.value, c.value, centroidRadius, midAngle)

  // convert centroid to screen coords using getScreenCTM if available
  let screenX = centroidSvg.x, screenY = centroidSvg.y
  const svg = svgEl.value
  if (svg && typeof svg.createSVGPoint === 'function' && svg.getScreenCTM) {
    const p = svg.createSVGPoint()
    p.x = centroidSvg.x
    p.y = centroidSvg.y
    const ctm = svg.getScreenCTM()
    if (ctm) {
      const transformed = p.matrixTransform(ctm)
      screenX = transformed.x
      screenY = transformed.y
    }
  } else {
    const rect = wrapEl.value?.getBoundingClientRect()
    if (rect) {
      screenX = rect.left + (centroidSvg.x / size) * rect.width
      screenY = rect.top + (centroidSvg.y / size) * rect.height
    }
  }

  // convert to wrapper-local coords for absolutely positioned tooltip
  const rect = wrapEl.value?.getBoundingClientRect()
  const tipX = rect ? (screenX - rect.left) : clientX
  const tipY = rect ? (screenY - rect.top) : clientY

  tip.value = { show: true, x: tipX, y: tipY, label: s.label, value: s.value, color: s.color }
  hoverColor.value = s.color
}

/* ---------- readable label color ---------- */
function labelTextColor(hex = '#000000') {
  try {
    const h = String(hex || '').replace('#', '')
    const full = (h.length === 3) ? h.split('').map(ch => ch + ch).join('') : h.padEnd(6, '0')
    const rch = parseInt(full.slice(0, 2), 16)
    const gch = parseInt(full.slice(2, 4), 16)
    const bch = parseInt(full.slice(4, 6), 16)
    const luminance = (0.299 * rch + 0.587 * gch + 0.114 * bch) / 255
    return luminance > 0.6 ? '#111827' : '#ffffff'
  } catch { return '#ffffff' }
}
</script>

<style scoped>
/* Tailwind handles most; safety class left in place */
.pointer-events-none { pointer-events: none; }
</style>
