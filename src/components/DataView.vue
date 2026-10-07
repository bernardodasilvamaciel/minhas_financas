<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../stores/finance'
import { openSheet } from '../lib/sheets'
import { encodeData, linkFor, isLocalhost } from '../lib/sync'
import { parseAny } from '../lib/storage'
import { copyText, share, download, isTouch } from '../lib/device'
import { todayISO, formatDay } from '../lib/months'

const store = useFinance()
const local = isLocalhost()
const busy = ref(false)

const counts = computed(() => ({
  cards: store.data.cards.length,
  purchases: store.data.purchases.length,
  items: store.data.items.length,
}))
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const isEmpty = computed(() => !counts.value.cards && !counts.value.purchases && !counts.value.items && !store.data.balance)

async function sendLink() {
  busy.value = true
  try {
    const link = linkFor(await encodeData(store.data))
    const result = isTouch()
      ? await share({ title: 'Minhas finanças', text: 'Abra no outro aparelho para levar seus dados:', url: link })
      : 'unsupported'
    if (result === 'unsupported') {
      store.notify(await copyText(link)
        ? 'Link copiado. Mande para você mesmo (WhatsApp, e-mail) e abra no outro aparelho.'
        : 'Não deu para copiar. Use o código ou o QR.')
    }
  } finally { busy.value = false }
}

async function copyCode() {
  busy.value = true
  try {
    const code = await encodeData(store.data)
    store.notify(await copyText(code)
      ? 'Código copiado. No outro aparelho: Dados → Colar código.'
      : 'Não deu para copiar o código.')
  } finally { busy.value = false }
}

async function saveBackup() {
  const blob = store.backupBlob()
  const name = `minhas-financas-${todayISO()}.json`
  const file = new File([blob], name, { type: 'application/json' })
  const result = isTouch() ? await share({ files: [file], title: 'Backup — minhas finanças' }) : 'unsupported'
  if (result === 'cancelled') return
  if (result === 'unsupported') download(blob, name)
  store.prefs.lastBackup = todayISO()
}

const fileInput = ref(null)
async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const incoming = parseAny(JSON.parse(await file.text()))
    openSheet('import', { incoming, source: 'arquivo' })
  } catch {
    store.notify('Esse arquivo não é um backup válido.')
  }
}

function resetAll() {
  if (!confirm('Apagar todos os dados deste aparelho? Os outros aparelhos não são afetados.')) return
  store.resetAll()
  store.notify('Tudo apagado', { undo: true })
}

const THEMES = [
  { id: 'auto', label: 'Automático' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
]
</script>

<template>
  <div class="data">
    <h1 class="title">Seus dados</h1>
    <p class="lead">
      Tudo fica guardado só neste navegador. Para usar no celular e no computador, mande de um para o outro.
    </p>

    <section class="box">
      <h2>Mandar para outro aparelho</h2>
      <p class="hint top">
        <template v-if="isEmpty">Ainda não tem nada para mandar.</template>
        <template v-else>{{ plural(counts.cards, 'cartão', 'cartões') }}, {{ plural(counts.purchases, 'compra', 'compras') }}, {{ plural(counts.items, 'conta ou entrada', 'contas e entradas') }}.</template>
      </p>
      <div class="stack">
        <button class="btn btn-primary btn-block" :disabled="busy || isEmpty" @click="sendLink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
          Enviar link
        </button>
        <div class="pair">
          <button class="btn btn-ghost" :disabled="busy || isEmpty" @click="openSheet('qr')">Mostrar QR code</button>
          <button class="btn btn-ghost" :disabled="busy || isEmpty" @click="copyCode">Copiar código</button>
        </div>
      </div>
      <p v-if="local" class="hint">
        Você está abrindo o app por <b>localhost</b>, então o link só funciona neste computador.
        Para o celular, use o código ou o QR (lido pela opção “Escanear QR code” do app no celular).
      </p>
      <p v-else class="hint">
        O link leva tudo junto: abra no outro aparelho e confirme. Mande pelo WhatsApp para você mesmo, por exemplo.
      </p>
    </section>

    <section class="box">
      <h2>Receber de outro aparelho</h2>
      <div class="stack">
        <button class="btn btn-ghost btn-block" @click="openSheet('scan')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" /></svg>
          Escanear QR code
        </button>
        <div class="pair">
          <button class="btn btn-ghost" @click="openSheet('paste')">Colar código</button>
          <button class="btn btn-ghost" @click="fileInput.click()">Abrir arquivo</button>
        </div>
      </div>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFile">
      <p class="hint">“Colar código” também aceita o link. Antes de importar, você escolhe se junta com o que já tem aqui ou substitui tudo.</p>
    </section>

    <section class="box">
      <h2>Backup</h2>
      <p class="hint top">
        {{ store.prefs.lastBackup ? `Último backup em ${formatDay(store.prefs.lastBackup)}.` : 'Você ainda não fez backup.' }}
        Se limpar os dados do navegador sem backup, tudo se perde.
      </p>
      <button class="btn btn-ghost btn-block" :disabled="isEmpty" @click="saveBackup">Salvar arquivo de backup</button>
    </section>

    <section class="box">
      <h2>Aparência</h2>
      <div class="chips seg" role="radiogroup" aria-label="Tema">
        <button
          v-for="t in THEMES" :key="t.id" class="chip" role="radio"
          :aria-checked="store.prefs.theme === t.id" @click="store.prefs.theme = t.id"
        >{{ t.label }}</button>
      </div>
    </section>

    <details class="box how">
      <summary><h2>Como a conta é feita</h2></summary>
      <p>Cada mês começa com o que sobrou do mês anterior. No mês atual, começa com o “Tenho agora”.</p>
      <p>Soma o que entra (salário, quem te deve) e tira o que sai (faturas e contas). O resultado é o que sobra no fim do mês, e passa para o próximo.</p>
      <p>Compras parceladas aparecem em cada fatura, uma parcela por mês. A fatura em que a compra cai depende do dia de fechamento do cartão.</p>
      <p>Quando você marca algo como pago ou recebido, o app entende que o dinheiro já saiu ou entrou, e que isso já está no “Tenho agora”. Por isso não conta de novo.</p>
    </details>

    <section class="box danger">
      <button class="link minus" @click="resetAll">Apagar tudo deste aparelho</button>
    </section>
  </div>
</template>

<style scoped>
.data { padding-top: 12px; display: flex; flex-direction: column; gap: 14px; }
.title { font-family: var(--f-display); font-stretch: 80%; font-size: 38px; font-weight: 750; letter-spacing: -.03em; line-height: 1; }
.lead { color: var(--ink-2); margin-bottom: 4px; }
.box {
  background: var(--sheet);
  border-radius: var(--r-lg);
  padding: 18px 16px;
  box-shadow: var(--shadow);
}
.box h2 { font-size: 17px; font-weight: 700; }
.hint.top { margin: 4px 0 14px; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pair .btn { padding: 0 10px; font-size: 15px; }
.seg { margin-top: 12px; }
.seg .chip { flex: 1; justify-content: center; }
.how summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
.how summary::-webkit-details-marker { display: none; }
.how summary::after { content: '+'; font-size: 22px; color: var(--ink-3); }
.how[open] summary::after { content: '−'; }
.how p { color: var(--ink-2); font-size: 15px; line-height: 1.5; margin-top: 10px; }
.danger { background: transparent; box-shadow: none; padding: 4px 4px 0; }
</style>
