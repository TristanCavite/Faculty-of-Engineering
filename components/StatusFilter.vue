<!-- components/StatusFilter.vue -->
<template>
  <div class="flex items-center gap-3">
    <!-- Desktop label -->
    <label class="hidden text-sm font-medium text-gray-700 sm:inline">
      Status:
    </label>

    <div class="relative inline-block">
      <DropdownMenu>
        <!-- Trigger button -->
        <DropdownMenuTrigger
          class="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-100"
          aria-label="Filter by status"
          type="button"
        >
          <component :is="selectedIcon" class="h-4 w-4 text-maroon" />
          <span class="whitespace-nowrap">
            {{ selectedLabel }}
          </span>
        </DropdownMenuTrigger>

        <!-- Dropdown content -->
        <DropdownMenuContent class="absolute left-0 z-50 mt-2 w-44">
          <DropdownMenuItem
            v-for="opt in opts"
            :key="opt.value"
            @click="select(opt.value)"
            class="flex items-center gap-2"
          >
            <component :is="opt.icon" class="mr-2 h-4 w-4 text-gray-600" />
            <span>{{ opt.label }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * StatusFilter.vue
 * - Two-way bound via v-model="status"
 * - Default options: All, Published, Pending, Draft
 * - Parent can override with custom `options` if needed.
 */

import DropdownMenu from "@/components/Ui/DropdownMenu/DropdownMenu.vue";
import DropdownMenuTrigger from "@/components/Ui/DropdownMenu/Trigger.vue";
import DropdownMenuContent from "@/components/Ui/DropdownMenu/Content.vue";
import DropdownMenuItem from "@/components/Ui/DropdownMenu/Item.vue";

import { ListFilter, CheckCircle2, FileText, Clock } from "lucide-vue-next";
import { computed } from "vue";

// Internal status values used by filters on the page
type StatusValue = "all" | "published" | "pending" | "draft";

// Option type for each menu item
type Option = {
  value: StatusValue | string;
  label: string;
  icon: any;
};

const props = defineProps<{
  /** Current selected value (v-model) */
  modelValue?: string;
  /** Optional custom options list; if not provided, DEFAULT_OPTIONS is used. */
  options?: Option[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();

/**
 * Default options:
 * - All
 * - Published
 * - Pending
 * - Draft
 */
const DEFAULT_OPTIONS: Option[] = [
  { value: "all",       label: "All",       icon: ListFilter },
  { value: "published", label: "Published", icon: CheckCircle2 },
  { value: "pending",   label: "Pending",   icon: Clock },
  { value: "draft",     label: "Draft",     icon: FileText },
];

// Use provided options if passed, otherwise fall back to defaults
const opts = computed<Option[]>(() =>
  props.options?.length ? props.options : DEFAULT_OPTIONS
);

// Currently selected value (defaults to "all")
const selected = computed(() => props.modelValue ?? "all");

// Label & icon for the current selection
const selectedLabel = computed(
  () => opts.value.find((o) => o.value === selected.value)?.label ?? "All"
);
const selectedIcon = computed(
  () => opts.value.find((o) => o.value === selected.value)?.icon ?? ListFilter
);

/** Emit the new selected value for v-model */
function select(v: string) {
  emit("update:modelValue", v);
}
</script>
