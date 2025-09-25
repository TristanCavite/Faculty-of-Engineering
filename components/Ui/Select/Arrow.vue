<template>
  <SelectArrow data-slot="select-arrow" v-bind="useForwardProps(props)" />
</template>

<script lang="ts" setup>
  import { SelectArrow, useForwardProps } from "reka-ui";
  import type { SelectArrowProps } from "reka-ui";

  const props = withDefaults(defineProps<SelectArrowProps>(), {
    width: 10,
    height: 5,
  });
</script>
