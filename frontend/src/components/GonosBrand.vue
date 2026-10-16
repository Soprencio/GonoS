<script setup>
defineProps({
  showText: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'md' // 'sm', 'md', 'lg'
  }
})
</script>

<template>
  <router-link
    to="/"
    class="gonos-brand"
    :class="[`size-${size}`]"
    title="Ir al inicio - GonoS"
  >
    <div class="logo-icon-wrapper">
      <svg
        class="gonos-logo-svg"
        viewBox="0 0 30.30 36.71"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <polygon points="5.25,21.01 5.25,8.76 1.01,23.46" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.00,23.45 1.01,23.46 1.01,11.21" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="5.25,8.76 1.01,11.21 1.01,23.46" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.00,11.21 1.00,23.45 1.01,11.21" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="5.25,8.76 5.24,8.76 1.01,11.21" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="5.24,8.76 1.00,11.21 1.01,11.21" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,23.46 22.22,27.54 15.15,19.38" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.86,6.72 15.86,1.01 1.01,9.58" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.23,23.45 15.16,19.37 15.15,19.38" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.86,1.00 1.01,9.58 15.86,1.01" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.22,27.54 22.22,23.46 15.15,19.38" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,15.30 15.86,6.72 1.01,9.58" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.22,27.54 22.23,27.54 22.22,23.46" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.22,23.46 22.23,23.45 15.15,19.38" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.23,27.54 22.23,23.45 22.22,23.46" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,9.58 1.01,9.58 15.86,1.01" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,15.29 1.01,15.30 1.01,9.58" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,15.30 1.01,9.58 1.01,9.58" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,27.54 15.15,35.71 1.01,23.46" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.16,31.62 1.01,23.45 1.01,23.46" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,35.71 15.15,31.62 1.01,23.46" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,31.62 15.16,31.62 1.01,23.46" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,31.61 29.29,23.45 25.76,21.41" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,31.62 29.29,23.46 29.29,23.45" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,35.71 15.16,35.70 15.15,31.62" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.16,35.70 15.16,31.62 15.15,31.62" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="11.61,29.57 15.15,31.61 25.76,21.41" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,23.45 11.61,29.57 5.25,21.00" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,31.61 15.15,31.62 29.29,23.45" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,23.45 1.01,23.46 11.61,29.57" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="11.61,29.57 15.86,27.12 5.25,21.00" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="11.61,29.57 11.61,29.58 15.15,31.61" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="11.61,29.58 15.15,31.62 15.15,31.61" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,19.37 22.15,23.41 18.68,17.33" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.86,6.72 29.29,14.48 15.86,1.00" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="1.01,23.46 11.61,29.58 11.61,29.57" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="11.61,29.58 15.86,27.13 15.86,27.12" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.15,23.41 25.69,21.37 18.68,17.33" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,19.37 15.15,19.38 22.15,23.41" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="11.61,29.57 11.61,29.58 15.86,27.12" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="29.29,27.54 29.29,23.46 15.15,31.62" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="29.30,8.76 15.86,1.00 15.86,1.00" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.15,23.42 25.69,21.38 25.69,21.37" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,19.38 22.15,23.42 22.15,23.41" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="29.28,23.45 15.14,31.62 29.29,23.46" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="22.15,23.41 22.15,23.42 25.69,21.37" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="29.29,14.48 29.29,8.76 15.86,1.00" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,35.71 29.29,27.54 15.15,31.62" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="29.29,8.76 29.30,8.76 15.86,1.00" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.14,31.62 15.15,31.62 29.29,23.46" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="29.29,14.48 29.30,14.47 29.29,8.76" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="29.30,14.47 29.30,8.76 29.29,8.76" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.14,35.70 15.15,35.71 15.14,31.62" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
        <polygon points="15.15,35.71 15.15,31.62 15.14,31.62" fill="currentColor" fill-opacity="0.95" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round" />
      </svg>
    </div>
    <span v-if="showText" class="gonos-brand-text">GonoS</span>
  </router-link>
</template>

<style scoped>
.gonos-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  cursor: pointer;
  outline: none;
  user-select: none;
  border-radius: var(--radius-md);
  padding: 4px 8px;
  margin: -4px -8px;
  transition: transform var(--transition-fast), filter var(--transition-fast), background-color var(--transition-fast);
}

.logo-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.gonos-logo-svg {
  display: block;
  color: var(--color-accent);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.gonos-brand-text {
  font-family: inherit;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--color-text);
  line-height: 1;
  transition: color var(--transition-fast);
}

/* Tamaños */
.size-sm .gonos-logo-svg {
  width: 22px;
  height: 26px;
}
.size-sm .gonos-brand-text {
  font-size: 1.25rem;
}

.size-md .gonos-logo-svg {
  width: 28px;
  height: 34px;
}
.size-md .gonos-brand-text {
  font-size: 1.55rem;
}

.size-lg .gonos-logo-svg {
  width: 36px;
  height: 44px;
}
.size-lg .gonos-brand-text {
  font-size: 1.85rem;
}

/* Microinteracciones y Efectos Hover / Active */
.gonos-brand:hover {
  background-color: var(--color-accent-soft);
}

.gonos-brand:hover .logo-icon-wrapper {
  transform: translateY(-2px) scale(1.08) rotate(-2deg);
  filter: drop-shadow(0 0 10px var(--color-accent-soft)) drop-shadow(0 4px 12px var(--color-accent));
}

.gonos-brand:hover .gonos-brand-text {
  color: var(--color-accent);
}

.gonos-brand:active {
  transform: scale(0.94);
  background-color: transparent;
}

.gonos-brand:active .logo-icon-wrapper {
  transform: scale(0.92) rotate(1deg);
  filter: drop-shadow(0 0 4px var(--color-accent));
}

.gonos-brand:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
</style>
