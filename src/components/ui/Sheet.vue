<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  title: { type: String, required: true },
  tall: Boolean,
})
const emit = defineEmits(['close'])
const panel = ref(null)
let lastFocus = null

function onKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); emit('close') }
}

onMounted(() => {
  lastFocus = document.activeElement
  // Let a field inside claim focus first (e.g. the amount); otherwise focus the panel.
  requestAnimationFrame(() => {
    if (!panel.value?.contains(document.activeElement)) panel.value?.focus({ preventScroll: true })
  })
})
onBeforeUnmount(() => lastFocus?.focus?.({ preventScroll: true }))
</script>

<template>
  <div class="sheet-root" @keydown="onKey">
    <div class="scrim" @click="emit('close')" />
    <section ref="panel" class="panel" :class="{ tall }" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1">
      <div class="grab" aria-hidden="true" />
      <header class="head">
        <h2 class="title">{{ title }}</h2>
        <slot name="head-action" />
        <button class="close" aria-label="Fechar" @click="emit('close')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      <div class="body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="foot">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

<style scoped>
.sheet-root {
  position: fixed; inset: 0; z-index: 50;
  display: flex; align-items: flex-end; justify-content: center;
}
.scrim { position: absolute; inset: 0; background: var(--scrim); }
.panel {
  position: relative;
  width: 100%; max-width: 560px;
  max-height: calc(var(--vvh, 100dvh) - 24px);
  margin-bottom: var(--kb, 0px);
  background: var(--sheet);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  box-shadow: var(--shadow);
  display: flex; flex-direction: column;
  outline: none;
}
.panel.tall { height: calc(var(--vvh, 100dvh) - 24px); }
.grab { width: 40px; height: 5px; border-radius: 3px; background: var(--rule-strong); margin: 8px auto 0; flex: none; }
.head {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 8px 4px var(--gutter);
  flex: none;
}
.title {
  flex: 1; min-width: 0;
  font-family: var(--f-display); font-stretch: 85%;
  font-size: 22px; font-weight: 700; letter-spacing: -.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.close {
  width: 44px; height: 44px; border-radius: 50%;
  display: grid; place-items: center; color: var(--ink-2); flex: none;
}
.close:active { background: var(--sunken); }
.body {
  flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain;
  padding: 8px var(--gutter) 20px;
}
.foot {
  flex: none;
  padding: 12px var(--gutter) calc(12px + var(--safe-b));
  border-top: 1px solid var(--rule);
  display: flex; gap: 10px;
}

@media (min-width: 640px) {
  .sheet-root { align-items: center; padding: 24px; }
  .panel { border-radius: var(--r-lg); max-height: min(760px, calc(100dvh - 48px)); margin-bottom: 0; }
  .panel.tall { height: min(760px, calc(100dvh - 48px)); }
  .grab { display: none; }
  .head { padding-top: 12px; }
  .foot { padding-bottom: 16px; border-radius: 0 0 var(--r-lg) var(--r-lg); }
}
</style>
