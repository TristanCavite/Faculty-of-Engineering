<template>
  <DropdownMenuArrow
    data-slot="dropdown-menu-arrow"
    v-bind="forwarded"
    :class="styles({ class: props.class })"
  />
</template>

<script lang="ts" setup>
  import { DropdownMenuArrow } from "reka-ui";
  import type { DropdownMenuArrowProps } from "reka-ui";
  import type { HTMLAttributes } from "vue";

  const props = withDefaults(
    defineProps<
      DropdownMenuArrowProps & {
        /** Custom class(es) to add to the parent */
        class?: HTMLAttributes["class"];
      }
    >(),
    {
      asChild: false,
      width: 10,
      height: 5,
    }
  );
  const forwarded = reactiveOmit(props, "class");
  const styles = tv({
    base: "rotate-45 border bg-muted",
  });
</script>
