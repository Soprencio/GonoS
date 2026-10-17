<script setup>
import SkeletonBlock from './SkeletonBlock.vue'
</script>

<template>
  <div class="class-card-skeleton" aria-hidden="true">
    <div class="header-row">
      <SkeletonBlock width="55%" height="20px" />
      <SkeletonBlock width="65px" height="18px" border-radius="10px" />
    </div>
    <div class="desc-lines">
      <SkeletonBlock width="90%" height="14px" />
      <SkeletonBlock width="70%" height="14px" />
    </div>
    <div class="meta-row">
      <SkeletonBlock width="90px" height="12px" />
    </div>
  </div>
</template>

<style scoped>
.class-card-skeleton {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.desc-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  margin-top: 4px;
}
</style>
