<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { useFinance } from '../stores/finance'
import { useFmt } from '../composables/useFmt'
import { monthRange, monthShort, monthName } from '../lib/months'

// The month selector doubles as a forecast: each month shows what's left
// at its end, so you can see the next months at a glance.
const store = useFinance()
const { compact } = useFmt()
const scroller = ref(null)

const months = computed(() => monthRange(store.range.from, store.range.to).map(m => {
  const row = store.proj[m]
  return { key: m, value: row ? row.closing : 0, past: m < store.today }
}))

const scale = computed(() => {
  let up = 0, down = 0
  for (const m of months.value) {
    if (m.value > up) up = m.value
    if (-m.value > down) down = -m.value
  }
  const span = up + down || 1
  return { up, down, span, base: up / span }
})

function barStyle(v) {
  const { span, base } = scale.value
  const h = Math.max(Math.abs(v) / span, v ? 0.04 : 0) * 100
  return v >= 0
    ? { bottom: `${(1 - base) * 100}%`, height: `${h}%` }
    : { top: `${base * 100}%`, height: `${h}%` }
}

function center(smooth = true) {
  const el = scroller.value?.querySelector('[aria-selected="true"]')
  el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
}

watch(() => store.selected, () => nextTick(() => center()))
onMounted(() => nextTick(() => center(false)))
</script>

<template>
  <div class="strip-wrap">
    <div ref="scroller" class="strip" role="tablist" aria-label="Meses">
      <button
        v-for="m in months" :key="m.key"
        class="mo" :class="{ past: m.past, neg: m.value < 0, now: m.key === store.today }"
        role="tab" :aria-selected="m.key === store.selected"
        :aria-label="`${monthName(m.key, { year: true })}: ${m.past ? 'resultado' : 'sobra'} ${compact(m.value)}`"
        @click="store.select(m.key)"
      >
        <span v-if="m.key === store.today" class="now-dot" aria-hidden="true" />
        <span class="plot" aria-hidden="true">
          <span class="base" :style="{ top: scale.base * 100 + '%' }" />
          <span class="bar" :style="barStyle(m.value)" />
        </span>
        <span class="name">{{ monthShort(m.key) }}<span v-if="m.key.endsWith('-01')" class="yr">{{ m.key.slice(2, 4) }}</span></span>
        <span class="val num">{{ compact(m.value) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.strip-wrap { position: relative; }
.strip {
  display: flex; gap: 2px;
  overflow-x: auto; scroll-snap-type: x proximity;
  padding: 4px var(--gutter) 8px;
  scrollbar-width: none;
  mask-image: linear-gradient(90deg, transparent 0, #000 var(--gutter), #000 calc(100% - var(--gutter)), transparent 100%);
}
.strip::-webkit-scrollbar { display: none; }

.mo {
  flex: none; width: 58px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px 0 8px;
  border-radius: var(--r-md);
  scroll-snap-align: center;
  color: var(--ink-3);
  transition: background-color .2s, color .2s;
}
.plot { position: relative; width: 14px; height: 44px; }
.base { position: absolute; left: -6px; right: -6px; height: 1px; background: var(--rule-strong); }
.bar {
  position: absolute; left: 0; right: 0;
  background: var(--blue); opacity: .32;
  border-radius: 3px;
  transition: height .35s cubic-bezier(.2,.8,.2,1), opacity .2s;
}
.neg .bar { background: var(--red); }
.past .bar { background: var(--ink-3); }

.name { font-size: 14px; font-weight: 600; text-transform: capitalize; line-height: 1; }
.val { font-size: 11px; line-height: 1; opacity: .85; }
.neg .val { color: var(--red); }

.mo { position: relative; }
.now-dot { position: absolute; top: 4px; width: 5px; height: 5px; border-radius: 50%; background: var(--ink-2); }
.yr { font-size: 10px; font-weight: 500; margin-left: 2px; opacity: .8; }

.mo[aria-selected="true"] { background: var(--sheet); color: var(--ink); box-shadow: var(--shadow); }
.mo[aria-selected="true"] .bar { opacity: 1; }

@media (min-width: 640px) {
  .mo { width: 64px; }
}
</style>
