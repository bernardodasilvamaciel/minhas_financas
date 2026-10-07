<script setup>
const model = defineModel({ type: Boolean, default: false })
defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
})
</script>

<template>
  <button type="button" class="switch" role="switch" :aria-checked="model" @click="model = !model">
    <span>
      <span class="label">{{ label }}</span>
      <span v-if="hint" class="sub">{{ hint }}</span>
    </span>
    <span class="switch-track" aria-hidden="true" />
  </button>
</template>

<style scoped>
.label { display: block; font-weight: 600; }
.sub { display: block; font-size: 14px; color: var(--ink-3); margin-top: 2px; }
</style>
