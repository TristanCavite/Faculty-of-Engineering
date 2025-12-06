<template>
  <div class="flex items-center gap-3">
    <!-- <label class="hidden text-sm font-medium text-gray-700 sm:inline">Filter by:</label> -->

    <!-- relative container ensures the dropdown content can be absolutely positioned -->
    <div class="relative inline-block hover:scale-105">
      <DropdownMenu>
        <DropdownMenuTrigger
          class="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-md shadow-sm hover:bg-gray-100"
          aria-label="Filter events"
          type="button"
        >
          <component :is="selectedIcon" class="w-4 h-4 text-maroon" />
          <span class="whitespace-nowrap">{{ selectedLabel }}</span>
        </DropdownMenuTrigger>

        <!-- make sure content is absolutely positioned so it doesn't affect layout -->
        <DropdownMenuContent class="absolute left-0 z-10 mt-2 w-44">
          <DropdownMenuItem
            v-for="opt in TYPE_OPTIONS"
            :key="opt.value"
            @click="select(opt.value)"
            class="flex items-center gap-2 "
          >
            <component :is="opt.icon" class="w-4 h-4 mr-2 text-gray-600" />
            <span class="font-medium font-montserrat">{{ opt.label }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import DropdownMenu from "@/components/Ui/DropdownMenu/DropdownMenu.vue";
import DropdownMenuTrigger from "@/components/Ui/DropdownMenu/Trigger.vue";
import DropdownMenuContent from "@/components/Ui/DropdownMenu/Content.vue";
import DropdownMenuItem from "@/components/Ui/DropdownMenu/Item.vue";

import { ListFilter, GraduationCap, School, Users, Building2, Globe } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const TYPE_OPTIONS = [
  { value: "all", label: "All Events", icon: ListFilter },
  { value: "university", label: "University", icon: GraduationCap },
  { value: "faculty", label: "Faculty", icon: School },
  { value: "students", label: "Students", icon: Users },
  { value: "department", label: "Department", icon: Building2 },
  { value: "general", label: "General", icon: Globe },
] as const;

const selectedValue = computed(() => props.modelValue ?? "all");
const selectedLabel = computed(() => TYPE_OPTIONS.find((o) => o.value === selectedValue.value)?.label ?? "All events");
const selectedIcon = computed(() => TYPE_OPTIONS.find((o) => o.value === selectedValue.value)?.icon ?? ListFilter);

function select(val: string) {
  emit("update:modelValue", val);
}
</script>

<style scoped>
/* ensure the dropdown content layer doesn't accidentally overflow the page */
.absolute {
  /* no-op here — Tailwind handles positioning; kept for explicitness if you reuse plain CSS */
}
</style>
