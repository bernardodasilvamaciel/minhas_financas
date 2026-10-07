<script setup>
import { useFinance } from '../stores/finance'
const store = useFinance()
</script>

<template>
  <div class="toast-zone" aria-live="polite">
    <Transition name="toast">
      <div v-if="store.toast" :key="store.toast.id" class="toast">
        <span>{{ store.toast.text }}</span>
        <button v-if="store.toast.undo" class="undo" @click="store.undo()">Desfazer</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-zone {
  position: fixed; left: 0; right: 0; z-index: 80;
  bottom: calc(var(--nav-h) + var(--safe-b) + 12px);
  display: flex; justify-content: center; padding: 0 var(--gutter);
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  max-width: 520px; width: 100%;
  display: flex; align-items: center; gap: 12px;
  background: var(--ink); color: var(--paper);
  border-radius: var(--r-md);
  padding: 12px 8px 12px 16px;
  font-size: 15px; line-height: 1.35;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, .45);
}
.toast span { flex: 1; }
.undo { color: var(--toast-accent); font-weight: 700; padding: 8px 10px; border-radius: 8px; flex: none; }
.toast-enter-active { transition: transform .28s cubic-bezier(.2, .9, .25, 1), opacity .2s; }
.toast-leave-active { transition: opacity .18s; }
.toast-enter-from { transform: translateY(16px); opacity: 0; }
.toast-leave-to { opacity: 0; }
@media (min-width: 640px) {
  .toast-zone { bottom: calc(var(--nav-h) + 32px); }
}
</style>
