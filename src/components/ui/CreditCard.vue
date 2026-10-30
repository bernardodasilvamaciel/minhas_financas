<script setup>
import { computed } from 'vue'
import { cardIsLight } from '../../lib/finance'

// The face of a credit card. Purely visual: whoever uses it decides what a tap does.
const props = defineProps({
  name: { type: String, default: '' },
  color: { type: String, default: '#2B2F36' },
  closingDay: { type: Number, default: null },
  dueDay: { type: Number, default: null },
  value: { type: String, default: '' },          // formatted invoice total, top right
  meta: { type: String, default: '' },           // small line under the name
})

const light = computed(() => cardIsLight(props.color))
const pad = d => (d ? String(d).padStart(2, '0') : '––')
</script>

<template>
  <div class="cc" :class="{ light }" :style="{ '--card': color || '#2B2F36' }">
    <div class="top">
      <span class="name">{{ name || 'Seu cartão' }}</span>
      <span v-if="value" class="value num">{{ value }}</span>
    </div>
    <p v-if="meta" class="meta">{{ meta }}</p>

    <span class="chip" aria-hidden="true">
      <svg viewBox="0 0 40 30" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 10.5h13M0 19.5h13M27 10.5h13M27 19.5h13M13 0v30M27 0v30M13 15h14" /></svg>
    </span>
    <svg class="wave" width="20" height="24" viewBox="0 0 20 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <path d="M3.5 8.5a5 5 0 0 1 0 7M8 6a8.5 8.5 0 0 1 0 12M12.5 3.5a12 12 0 0 1 0 17" />
    </svg>

    <div class="bottom">
      <span class="day"><span class="lbl">Fecha</span><span class="num">{{ pad(closingDay) }}</span></span>
      <span class="day"><span class="lbl">Vence</span><span class="num">{{ pad(dueDay) }}</span></span>
      <span class="brand">crédito</span>
    </div>
  </div>
</template>

<style scoped>
.cc {
  --on: #fff;
  --deep: color-mix(in srgb, var(--card) 56%, #000);
  position: relative;
  width: 100%; aspect-ratio: 1.586;          /* the real proportion of a bank card */
  padding: 16px 18px;
  border-radius: 18px;
  overflow: hidden;
  color: var(--on);
  text-shadow: 0 1px 1px rgb(0 0 0 / .12);
  background:
    radial-gradient(115% 135% at 100% 0%, rgb(255 255 255 / .22), transparent 52%),
    repeating-radial-gradient(circle at 112% -18%, rgb(255 255 255 / .07) 0 1px, transparent 1.5px 15px),
    linear-gradient(150deg, var(--card) 18%, var(--deep));
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / .12),
    0 -3px 12px -6px rgb(0 0 0 / .3),
    0 18px 34px -18px rgb(0 0 0 / .55);
}
.cc.light { --on: #14202F; --deep: color-mix(in srgb, var(--card) 82%, #000); text-shadow: none; }

.top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.name {
  font-family: var(--f-display); font-stretch: 85%;
  font-size: 21px; font-weight: 700; letter-spacing: -.01em;
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.value { font-size: 17px; font-weight: 600; flex: none; }
.meta { margin-top: 4px; font-size: 13.5px; opacity: .82; }

.chip {
  position: absolute; left: 18px; top: 47%;
  width: 40px; height: 30px; border-radius: 6px;
  background: linear-gradient(135deg, #F5E3A9, #D3AF60 50%, #B38A3C);
  color: rgb(80 55 10 / .45);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14);
}
.chip svg { width: 100%; height: 100%; }
.wave { position: absolute; left: 68px; top: calc(47% + 3px); opacity: .75; }

.bottom {
  position: absolute; left: 18px; right: 18px; bottom: 14px;
  display: flex; align-items: flex-end; gap: 18px;
}
.day { display: flex; flex-direction: column; gap: 1px; }
.lbl { font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; opacity: .72; }
.day .num { font-size: 15px; font-weight: 500; letter-spacing: .06em; }
.brand {
  margin-left: auto;
  font-family: var(--f-display); font-stretch: 80%;
  font-size: 17px; font-weight: 700; font-style: italic;
  opacity: .9;
}
</style>
