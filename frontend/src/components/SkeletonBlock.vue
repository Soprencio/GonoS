<script setup>
defineProps({
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '16px'
  },
  borderRadius: {
    type: String,
    default: 'var(--radius-sm)'
  },
  customClass: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div
    :class="['skeleton', customClass]"
    :style="{
      width: width,
      height: height,
      borderRadius: borderRadius
    }"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
/* Las animaciones e iluminación provienen de .skeleton en theme.css */
</style>
