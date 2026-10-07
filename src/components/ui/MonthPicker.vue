<script setup>
import { addMonths, monthName } from '../../lib/months'

const model = defineModel({ type: String, required: true })
defineProps({ min: { type: String, default: '' } })
</script>

<template>
  <div class="picker">
    <button type="button" class="arrow" aria-label="Mês anterior" :disabled="!!min && model <= min" @click="model = addMonths(model, -1)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
    </button>
    <span class="name" aria-live="polite">{{ monthName(model) }}</span>
    <button type="button" class="arrow" aria-label="Próximo mês" @click="model = addMonths(model, 1)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
    </button>
  </div>
</template>

<style scoped>
.picker {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--sunken); border-radius: 999px; padding: 4px;
}
.arrow {
  width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center; color: var(--ink-2);
}
.arrow:active { background: var(--sheet); }
.arrow:disabled { opacity: .3; }
.name { font-weight: 600; text-transform: capitalize; }
</style>
