<template>
  <ClientOnly fallback-tag="div">
    <TabsIndicator
      data-slot="tabs-indicator"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="styles({ class: props.class })"
    >
      <slot>
        <div class="w-full h-full bg-yellow-500 rounded-md" />
      </slot>
    </TabsIndicator>
    <template #fallback>
      <div class="absolute bottom-0 left-0 h-[3px] w-0 bg-yellow-500 rounded-md"></div>
    </template>
  </ClientOnly>
</template>

<script lang="ts" setup>
  import { TabsIndicator } from "reka-ui";
  import type { TabsIndicatorProps } from "reka-ui";
  import type { HTMLAttributes } from "vue";

  defineOptions({ inheritAttrs: false });

  const props = defineProps<
    TabsIndicatorProps & {
      /** Custom class(es) to add to parent element */
      class?: HTMLAttributes["class"];
    }
  >();
  const forwarded = reactiveOmit(props, "class");
  const styles = tv({
    base: "absolute bottom-0 left-0 h-[3px] rounded-full px-1 transition-[width,transform] duration-300",
  });
</script>

<style scoped>
[data-slot="tabs-indicator"] {
  width: var(--reka-tabs-indicator-size, 0px);
  transform: translateX(var(--reka-tabs-indicator-position, 0px));
}
</style>