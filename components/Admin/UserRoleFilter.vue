<!-- components/Admin/UserRoleFilter.vue -->
<template>
  <div class="relative inline-block text-left" @click.stop>
    <!-- Trigger button -->
    <button
      type="button"
      @click="toggleOpen"
      :class="[
        'inline-flex w-44 items-center justify-between rounded-md border bg-white',
        'px-3 py-1.5 text-sm font-medium shadow-sm transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-red-900 focus:ring-offset-1',
        isOpen || modelValue ? 'border-red-900 text-red-900' : 'border-gray-300 text-gray-700'
      ]"
    >
      <div class="flex items-center gap-2">
        <Users class="w-4 h-4" />
        <span>{{ currentLabel }}</span>
      </div>

      <ChevronDown
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown menu -->
    <transition name="fade-dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg"
      >
        <ul class="py-1 text-sm text-gray-700">
          <!-- All roles -->
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
              @click="selectRole('')"
            >
              <Filter class="w-4 h-4 text-gray-500" />
              <span>All Roles</span>
            </button>
          </li>

          <!-- Department Head -->
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
              @click="selectRole('head_admin')"
            >
              <UserCog class="w-4 h-4 text-gray-500" />
              <span>Department Head</span>
            </button>
          </li>

          <!-- Faculty -->
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
              @click="selectRole('faculty')"
            >
              <GraduationCap class="w-4 h-4 text-gray-500" />
              <span>Faculty</span>
            </button>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Users,
  ChevronDown,
  Filter,
  UserCog,
  GraduationCap,
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)

const currentLabel = computed(() => {
  if (props.modelValue === 'head_admin') return 'Department Head'
  if (props.modelValue === 'faculty') return 'Faculty'
  return 'All Roles'
})

const toggleOpen = () => {
  isOpen.value = !isOpen.value
}

const selectRole = (value: string) => {
  emit('update:modelValue', value)
  isOpen.value = false
}

// Close when clicking outside
const handleClickOutside = () => {
  isOpen.value = false
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.fade-dropdown-enter-active,
.fade-dropdown-leave-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}
.fade-dropdown-enter-from,
.fade-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
