<!-- components/ManageItemSkeleton.vue -->
<template>
  <component
    :is="view === 'list' ? 'li' : 'div'"
    :class="boxClass"
    role="presentation"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
type View = 'grid' | 'list'
const props = withDefaults(defineProps<{
  view: View
  /** Optional override like 'h-72' */
  heightClass?: string
}>(), {
  view: 'grid',
  heightClass: '',
})

const boxClass = computed(() => {
  const h = props.heightClass || (props.view === 'grid' ? 'h-64' : 'h-24')
  // A single rounded gray box with shimmer. No inner layout.
  return [
    'relative overflow-hidden rounded-xl bg-slate-200',
    'skeleton-shimmer',
    'w-full',
    h,
  ].join(' ')
})
</script>

<style scoped>
/* subtle glossy sweep */
.skeleton-shimmer::after{
  content:'';
  position:absolute; inset:0;
  transform:translateX(-100%);
  background:linear-gradient(120deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.45) 20%,
    rgba(255,255,255,0) 40%);
  animation:shimmer 1.4s infinite;
}
@keyframes shimmer{ 100%{ transform:translateX(100%);} }
</style>
