<template>
  <!-- Make the dropdown content position relative to this wrapper -->
  <div class="relative inline-block">
    <DropdownMenu>
      <DropdownMenuTrigger
        class="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-100"
        aria-label="Filter by year"
        type="button"
      >
        <component :is="Icon" class="h-4 w-4 text-maroon" />
        <span class="whitespace-nowrap">{{ selectedLabel }}</span>
      </DropdownMenuTrigger>

      <!-- Match EventFilter placement -->
      <DropdownMenuContent class="absolute left-0 top-full mt-2 z-50 w-44">
        <DropdownMenuItem @click="select('all')">
          <span class="ml-1">All years</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          v-for="y in normalizedYears"
          :key="y"
          @click="select(String(y))"
        >
          <span class="ml-1">{{ y }}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import DropdownMenu from "@/components/Ui/DropdownMenu/DropdownMenu.vue";
import DropdownMenuTrigger from "@/components/Ui/DropdownMenu/Trigger.vue";
import DropdownMenuContent from "@/components/Ui/DropdownMenu/Content.vue";
import DropdownMenuItem from "@/components/Ui/DropdownMenu/Item.vue";
import { Calendar } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: String as () => string, default: "all" },
  years: { type: Array as () => Array<number | string>, default: () => [] },
  icon: { type: Object as () => any, default: () => Calendar },
});
const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();

const Icon = props.icon;
const selectedLabel = computed(() =>
  props.modelValue === "all" ? "All years" : props.modelValue
);

const normalizedYears = computed(() => {
  const set = new Set<string>();
  for (const y of props.years || []) if (y != null) set.add(String(y));
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
});

function select(val: string) {
  emit("update:modelValue", val);
}
</script>
