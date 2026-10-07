<script setup>
import { computed } from 'vue'
import { useFinance } from '../stores/finance'
import { openSheet } from '../lib/sheets'

const store = useFinance()

// A real sequence: the conta needs these three things to mean anything.
const steps = computed(() => [
  {
    label: 'Quanto você tem hoje',
    hint: 'na conta e guardado',
    done: !!store.data.balance,
    go: () => openSheet('balance'),
  },
  {
    label: 'O que entra todo mês',
    hint: 'salário, por exemplo',
    done: store.data.items.some(i => i.kind === 'income'),
    go: () => openSheet('entry', { kind: 'income', month: store.selected }),
  },
  {
    label: 'Seus cartões',
    hint: 'e depois as compras',
    done: store.data.cards.length > 0,
    go: () => openSheet('card', {}),
  },
])
const allDone = computed(() => steps.value.every(s => s.done))
</script>

<template>
  <section class="onb" aria-label="Primeiros passos">
    <div class="head">
      <h2>{{ allDone ? 'Tudo pronto' : 'Para a conta ficar certa' }}</h2>
      <button class="link" @click="store.prefs.onboardingDone = true">{{ allDone ? 'Fechar' : 'Agora não' }}</button>
    </div>
    <ol>
      <li v-for="(s, i) in steps" :key="i">
        <button class="step" :class="{ done: s.done }" @click="s.go()">
          <span class="n num">
            <svg v-if="s.done" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="t">
            <span class="l">{{ s.label }}</span>
            <span class="h">{{ s.hint }}</span>
          </span>
          <svg class="go" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.onb {
  border: 1.5px dashed var(--rule-strong);
  border-radius: var(--r-lg);
  padding: 12px 14px 6px;
  margin-bottom: 16px;
}
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h2 { font-family: var(--f-display); font-stretch: 85%; font-size: 18px; font-weight: 700; }
.head .link { font-size: 14px; color: var(--ink-3); }
ol { list-style: none; }
.step { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 12px; text-align: left; }
li + li .step { border-top: 1px solid var(--rule); }
.n {
  width: 28px; height: 28px; border-radius: 50%; flex: none;
  display: grid; place-items: center;
  font-size: 13px; font-weight: 600;
  box-shadow: inset 0 0 0 2px var(--ink);
}
.done .n { background: var(--blue); box-shadow: none; color: #fff; }
.t { flex: 1; display: flex; flex-direction: column; }
.l { font-weight: 600; }
.h { font-size: 13.5px; color: var(--ink-3); }
.done .l { color: var(--ink-3); }
.go { color: var(--ink-3); }
</style>
