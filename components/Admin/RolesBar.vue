<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <h2 class="mb-4 text-base font-semibold text-gray-800">
      {{ title }}
    </h2>

    <!-- Axis header (optional) -->
    <div class="mb-2 flex items-center justify-between text-xs text-gray-500">
      <span>Role</span>
      <span>Count</span>
    </div>

    <!-- Chart -->
    <svg :width="svgWidth" :height="rowHeight * rows.length" role="img" aria-label="Accounts by role bar chart">
      <g v-for="(r, i) in rows" :key="r.label" :transform="`translate(0, ${i * rowHeight})`">
        <!-- label -->
        <text
          :x="labelX" :y="rowCenter"
          dominant-baseline="middle"
          class="fill-gray-700 text-[12px]"
        >
          {{ r.label }}
        </text>

        <!-- bar track -->
        <rect
          :x="barX" :y="barY"
          :width="barW" :height="barH"
          rx="8" ry="8"
          class="fill-gray-100"
        />

        <!-- value bar -->
        <rect
          :x="barX" :y="barY"
          :width="valueWidth(r)" :height="barH"
          rx="8" ry="8"
          :class="r.color"
        />

        <!-- value text -->
        <text
          :x="barX + barW + 6" :y="rowCenter"
          dominant-baseline="middle"
          class="fill-gray-900 text-[12px] font-semibold"
        >
          {{ r.value }}
        </text>
      </g>
    </svg>

    <!-- Subtle axis line (optional) -->
    <div class="mt-3 h-px w-full bg-gray-100"></div>

    <!-- Legend -->
    <ul class="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
      <li v-for="r in rows" :key="r.label" class="flex items-center gap-2">
        <span class="inline-block size-3 rounded" :class="r.color"></span>
        {{ r.label }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  rows: Array<{ label: string; value: number; percent: number; color: string }>
}>()

// Layout constants
const rowHeight = 34
const paddingX = 12
const labelColW = 110   // left column for labels
const valueColW = 36    // right column for value text
const barGap = 12       // gap between label and bar track

// Derived geometry
const labelX = paddingX
const barX   = paddingX + labelColW + barGap
const barW   = 280      // width of the bar area
const barH   = 12
const barY   = (rowHeight - barH) / 2
const rowCenter = rowHeight / 2
const svgWidth = paddingX + labelColW + barGap + barW + 6 + valueColW + paddingX

// Convert percent -> width (clamp 0..100 just in case)
function valueWidth(r: { percent: number }) {
  const p = Math.max(0, Math.min(100, r.percent))
  return (p / 100) * barW
}
</script>

<style scoped>
/* uses Tailwind utility classes for colors via r.color */
</style>
