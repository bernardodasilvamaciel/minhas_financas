<script setup>
import { ref, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { useFinance } from './stores/finance'
import { sheets, openSheet, closeSheet } from './lib/sheets'
import { codeFromHash, decodeCode } from './lib/sync'

import MonthStrip from './components/MonthStrip.vue'
import MonthView from './components/MonthView.vue'
import CardsView from './components/CardsView.vue'
import DataView from './components/DataView.vue'
import Toast from './components/Toast.vue'

import EntrySheet from './components/sheets/EntrySheet.vue'
import BalanceSheet from './components/sheets/BalanceSheet.vue'
import CardSheet from './components/sheets/CardSheet.vue'
import InvoiceSheet from './components/sheets/InvoiceSheet.vue'
import ImportSheet from './components/sheets/ImportSheet.vue'
import QrSheet from './components/sheets/QrSheet.vue'
import ScanSheet from './components/sheets/ScanSheet.vue'
import PasteSheet from './components/sheets/PasteSheet.vue'

const SHEETS = {
  entry: EntrySheet, balance: BalanceSheet, card: CardSheet, invoice: InvoiceSheet,
  import: ImportSheet, qr: QrSheet, scan: ScanSheet, paste: PasteSheet,
}

const store = useFinance()

const TABS = [
  { id: 'mes', label: 'Mês' },
  { id: 'cartoes', label: 'Cartões' },
  { id: 'dados', label: 'Dados' },
]
const tab = ref('mes')

function go(id) {
  tab.value = id
  window.scrollTo({ top: 0 })
}

function quickAdd() {
  openSheet('entry', { kind: 'purchase' })
}

// ── Theme ────────────────────────────────────────────────────────────────
watchEffect(() => {
  const t = store.prefs.theme
  if (t === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', t)
})

// ── Lock page scroll behind sheets ───────────────────────────────────────
watchEffect(() => {
  document.documentElement.style.overflow = sheets.length ? 'hidden' : ''
})

// ── Keep sheets above the on-screen keyboard (iOS overlays it) ───────────
function syncViewport() {
  const vv = window.visualViewport
  if (!vv) return
  const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  document.documentElement.style.setProperty('--kb', `${kb}px`)
  document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
}

// ── Data arriving through a link: …/#importar=CODE ───────────────────────
async function importFromHash() {
  const code = codeFromHash()
  if (!code) return
  history.replaceState(null, '', location.pathname + location.search)
  try {
    openSheet('import', { incoming: await decodeCode(code), source: 'link' })
  } catch (e) {
    store.notify(e.message || 'Não deu para ler os dados do link.')
  }
}

onMounted(() => {
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
  syncViewport()
  importFromHash()
  window.addEventListener('hashchange', importFromHash)
  if (store.migratedFrom) {
    store.notify('Seus dados antigos foram trazidos para a versão nova.')
    store.migratedFrom = null
  }
})
onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('hashchange', importFromHash)
})
</script>

<template>
  <div class="app">
    <header class="top">
      <span class="wordmark">minhas finanças</span>
      <button
        class="icon-btn" :aria-pressed="store.prefs.hidden"
        :aria-label="store.prefs.hidden ? 'Mostrar valores' : 'Esconder valores'"
        @click="store.prefs.hidden = !store.prefs.hidden"
      >
        <svg v-if="!store.prefs.hidden" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17.6 17.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
      </button>
    </header>

    <MonthStrip v-if="tab !== 'dados'" />

    <main class="main">
      <Transition name="fade" mode="out-in">
        <MonthView v-if="tab === 'mes'" key="mes" />
        <CardsView v-else-if="tab === 'cartoes'" key="cartoes" />
        <DataView v-else key="dados" />
      </Transition>
    </main>

    <nav class="nav" aria-label="Seções">
      <button
        v-for="(t, i) in TABS" :key="t.id"
        class="nav-btn" :class="{ 'after-fab': i === 2 }"
        :aria-current="tab === t.id ? 'page' : undefined"
        @click="go(t.id)"
      >
        <svg v-if="t.id === 'mes'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 9h14M5 15h14" /></svg>
        <svg v-else-if="t.id === 'cartoes'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18" /></svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L4 7l3 3M4 7h12M17 20l3-3-3-3M20 17H8" /></svg>
        <span>{{ t.label }}</span>
      </button>
      <button class="fab" aria-label="Adicionar" @click="quickAdd">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </nav>

    <TransitionGroup name="sheet" :duration="{ enter: 320, leave: 220 }">
      <component
        :is="SHEETS[s.type]" v-for="s in sheets" :key="s.key"
        v-bind="s.props" :sheet-key="s.key"
        @close="closeSheet(s.key)"
      />
    </TransitionGroup>

    <Toast />
  </div>
</template>

<style scoped>
.app {
  max-width: 640px; margin: 0 auto;
  padding-bottom: calc(var(--nav-h) + var(--safe-b) + 32px);
}
.top {
  display: flex; align-items: center; justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 8px 0 var(--gutter);
}
.wordmark {
  font-family: var(--f-display); font-stretch: 80%;
  font-size: 18px; font-weight: 700; letter-spacing: -.01em;
}
.icon-btn {
  width: 44px; height: 44px; border-radius: 50%;
  display: grid; place-items: center; color: var(--ink-2);
}
.icon-btn:active { background: var(--sunken); }
.main { padding: 0 var(--gutter); }

/* ── Bottom navigation ─────────────────────────────────────────────────── */
.nav {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  height: calc(var(--nav-h) + var(--safe-b));
  padding: 0 8px var(--safe-b);
  background: color-mix(in srgb, var(--sheet) 92%, transparent);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  border-top: 1px solid var(--rule);
  display: grid; grid-template-columns: 1fr 1fr 84px 1fr; align-items: center;
}
.nav-btn {
  height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  color: var(--ink-3); font-size: 12px; font-weight: 600;
}
.nav-btn.after-fab { grid-column: 4; }
.nav-btn[aria-current="page"] { color: var(--ink); }
.fab {
  grid-column: 3; grid-row: 1; justify-self: center;
  width: 60px; height: 60px; border-radius: 50%;
  background: var(--ink); color: var(--paper);
  display: grid; place-items: center;
  transform: translateY(-14px);
  box-shadow: 0 6px 18px -6px rgba(20, 32, 48, .5), 0 0 0 5px var(--paper);
  transition: transform .12s ease;
}
.fab:active { transform: translateY(-14px) scale(.94); }

@media (min-width: 640px) {
  .nav {
    left: 50%; right: auto; bottom: 16px; transform: translateX(-50%);
    width: 420px; height: var(--nav-h); padding: 0 8px;
    border: 1px solid var(--rule); border-radius: 999px; box-shadow: var(--shadow);
  }
  .fab { transform: none; box-shadow: none; width: 52px; height: 52px; }
  .fab:active { transform: scale(.94); }
}
</style>

<style>
/* Sheet enter/leave (applies to the sheet root rendered by <TransitionGroup>) */
.sheet-enter-active .scrim, .sheet-leave-active .scrim { transition: opacity .25s ease; }
.sheet-enter-from .scrim, .sheet-leave-to .scrim { opacity: 0; }
.sheet-enter-active .panel { transition: transform .32s cubic-bezier(.2, .9, .25, 1), opacity .2s; }
.sheet-leave-active .panel { transition: transform .22s ease-in, opacity .2s; }
.sheet-enter-from .panel, .sheet-leave-to .panel { transform: translateY(100%); }
@media (min-width: 640px) {
  .sheet-enter-from .panel, .sheet-leave-to .panel { transform: translateY(24px) scale(.98); opacity: 0; }
}
</style>
