<script setup>
import { computed } from 'vue'
import { useFinance } from '../stores/finance'
import { useFmt } from '../composables/useFmt'
import { openSheet } from '../lib/sheets'
import { splitMoney } from '../lib/money'
import { monthName, addMonths, formatDay } from '../lib/months'
import { KINDS } from '../lib/finance'
import ContaGroup from './ContaGroup.vue'
import Onboarding from './Onboarding.vue'

const store = useFinance()
const { p } = useFmt()

const row = computed(() => store.view)
const m = computed(() => row.value.month)
const s = computed(() => row.value.summary)
const past = computed(() => row.value.past)
const isNow = computed(() => m.value === store.today)
const total = computed(() => row.value.closing)
const big = computed(() => splitMoney(total.value))
const name = computed(() => monthName(m.value))

const eyebrow = computed(() => {
  if (past.value) return `Resultado de ${name.value}`
  return `${total.value < 0 ? 'Falta' : 'Sobra'} no fim de ${name.value}`
})
const sub = computed(() => {
  if (past.value) return 'O que entrou menos o que saiu nesse mês.'
  if (total.value < 0) return 'Mesmo usando o que você tem, o dinheiro não fecha as contas.'
  return 'Depois de pagar todas as faturas e contas.'
})

// ── Opening line ───────────────────────────────────────────────────────────
const balance = computed(() => store.data.balance)
const opening = computed(() => {
  if (isNow.value) {
    const b = balance.value
    const stale = b && b.date && b.date.slice(0, 7) < store.today
    return {
      label: 'Tenho agora',
      value: b ? b.amount : null,
      sub: !b ? 'Toque para dizer quanto você tem hoje'
        : stale ? `Valor de ${formatDay(b.date)} — toque para atualizar`
        : `Atualizado em ${formatDay(b.date)}`,
      warn: !b || stale,
      action: () => openSheet('balance'),
    }
  }
  const prev = addMonths(m.value, -1)
  return {
    label: `${row.value.opening < 0 ? 'Falta' : 'Sobra'} de ${monthName(prev)}`,
    value: row.value.opening,
    sub: `Ver ${monthName(prev)}`,
    action: () => store.select(prev),
  }
})

// ── Groups ─────────────────────────────────────────────────────────────────
function itemRow(r) {
  const it = r.item
  const isOwed = it.kind === 'receivable'
  const title = isOwed ? (it.person || 'Alguém') : (it.description || KINDS[it.kind].short)
  const bits = []
  if (isOwed && it.description) bits.push(it.description)
  if (it.repeat) bits.push('todo mês')
  return {
    key: it.id, title, sub: bits.join(' · '), amount: r.amount, done: r.done,
    toggle: () => store.toggleItemDone(it.id, m.value),
    open: () => openSheet('entry', { id: it.id, kind: it.kind, month: m.value }),
  }
}

function shareRow(r) {
  const pu = r.purchase
  const bits = [pu.description || 'Compra']
  if (r.card) bits.push(r.of > 1 ? `${r.card.name} ${r.index}/${r.of}` : r.card.name)
  return {
    key: `${pu.id}:${m.value}`, title: pu.person, sub: bits.join(' · '), amount: r.amount, done: r.done,
    toggle: () => store.toggleShareReceived(pu.id, m.value),
    open: () => openSheet('entry', { id: pu.id, kind: 'purchase', month: m.value }),
  }
}

function invoiceRow(inv) {
  const c = inv.card
  const bits = []
  if (c.dueDay) bits.push(`vence dia ${c.dueDay}`)
  bits.push(inv.override !== null ? 'valor do banco' : `${inv.lines.length} ${inv.lines.length === 1 ? 'compra' : 'compras'}`)
  return {
    key: c.id, title: c.name, color: c.color, sub: bits.join(' · '), amount: inv.total, done: inv.paid,
    toggle: () => store.toggleInvoicePaid(c.id, m.value),
    open: () => openSheet('invoice', { cardId: c.id }),
  }
}

function progress(rows, word) {
  const done = rows.filter(r => r.done).length
  return rows.length && done ? `${done} de ${rows.length} ${word}` : ''
}

const groups = computed(() => {
  const sum = past.value ? s.value.all : s.value.pending
  const list = [
    { id: 'incomes', op: '+', label: 'Entradas', total: sum.incomes, rows: s.value.incomes.map(itemRow),
      addLabel: 'Adicionar entrada', doneWord: 'recebido', add: () => openSheet('entry', { kind: 'income', month: m.value }) },
    { id: 'owed', op: '+', label: 'Me devem', total: sum.owed, rows: s.value.owed.map(r => r.type === 'share' ? shareRow(r) : itemRow(r)),
      addLabel: 'Alguém te deve', doneWord: 'recebido', add: () => openSheet('entry', { kind: 'receivable', month: m.value }) },
    { id: 'invoices', op: '−', label: 'Faturas', total: sum.invoices, rows: s.value.invoices.map(invoiceRow),
      addLabel: 'Lançar compra no cartão', doneWord: 'paga', add: () => openSheet('entry', { kind: 'purchase', month: m.value }) },
    { id: 'bills', op: '−', label: 'Contas', total: sum.bills, rows: s.value.bills.map(itemRow),
      addLabel: 'Adicionar conta', doneWord: 'paga', add: () => openSheet('entry', { kind: 'bill', month: m.value }) },
  ]
  for (const g of list) g.progress = progress(g.rows, g.id === 'incomes' || g.id === 'owed' ? 'recebidos' : 'pagas')
  return list
})

function toggleGroup(id) {
  if (store.prefs.collapsed[id]) delete store.prefs.collapsed[id]
  else store.prefs.collapsed[id] = true
}

const showOnboarding = computed(() => !store.prefs.onboardingDone)
</script>

<template>
  <div class="month">
    <section class="hero" :aria-label="eyebrow">
      <p class="eyebrow">{{ eyebrow }}</p>
      <p class="total" :class="total < 0 ? 'minus' : 'plus'">
        <span :key="m + store.prefs.hidden" class="marker">
          <template v-if="store.prefs.hidden"><span class="cur">R$</span>•••••</template>
          <template v-else>
            <span class="cur">{{ big.sign }}R$</span>{{ big.int }}<span class="dec">,{{ big.dec }}</span>
          </template>
        </span>
      </p>
      <p class="sub">{{ sub }}</p>
    </section>

    <Onboarding v-if="showOnboarding" />

    <section class="conta" aria-label="A conta">
      <button v-if="!past" class="opening" :class="{ warn: opening.warn }" @click="opening.action()">
        <span class="op" aria-hidden="true" />
        <span class="o-text">
          <span class="o-label">{{ opening.label }}</span>
          <span class="o-sub">{{ opening.sub }}</span>
        </span>
        <span class="val num" :class="{ minus: opening.value < 0 }">
          {{ opening.value === null ? '—' : (opening.value < 0 ? '−' : '') + p(opening.value) }}
        </span>
      </button>

      <ContaGroup
        v-for="g in groups" :key="g.id"
        :op="g.op" :label="g.label" :total="g.total" :rows="g.rows"
        :progress="g.progress" :add-label="g.addLabel" :done-word="g.doneWord"
        :collapsed="!!store.prefs.collapsed[g.id]"
        @toggle-collapse="toggleGroup(g.id)" @add="g.add()"
      />

      <div class="result">
        <span class="op" aria-hidden="true">=</span>
        <span class="r-label">{{ past ? 'Resultado' : total < 0 ? 'Falta' : 'Sobra' }}</span>
        <span class="val num" :class="total < 0 ? 'minus' : 'plus'">{{ total < 0 ? '−' : '' }}{{ p(total) }}</span>
      </div>
    </section>

    <p v-if="!past" class="footnote">
      O que está marcado como pago ou recebido já saiu (ou entrou) no "Tenho agora", então não entra de novo na conta.
    </p>
  </div>
</template>

<style scoped>
/* ── Hero ──────────────────────────────────────────────────────────────── */
.hero { padding: 12px 0 20px; }
.total {
  font-family: var(--f-display);
  font-stretch: 78%;
  font-weight: 750;
  font-size: clamp(52px, 17vw, 84px);
  line-height: .95;
  letter-spacing: -.035em;
  margin: 10px 0 10px -2px;
  font-variant-numeric: tabular-nums;
}
.marker {
  display: inline-block; position: relative; padding: 0 6px 0 2px;
  isolation: isolate;
}
/* the highlighter stroke, drawn left to right whenever the month changes */
.marker::before {
  content: ''; position: absolute; z-index: -1;
  left: -4px; right: -6px; top: 42%; bottom: -4%;
  background: var(--marker);
  border-radius: 3px 10px 4px 12px / 8px 4px 10px 5px;
  transform: skewX(-8deg) rotate(-.8deg);
  transform-origin: left center;
  animation: draw .55s .1s cubic-bezier(.3, .7, .2, 1) both;
}
@keyframes draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.cur { font-size: .36em; font-weight: 600; letter-spacing: 0; vertical-align: .95em; margin-right: .12em; }
.dec { font-size: .48em; letter-spacing: -.02em; }
.sub { color: var(--ink-2); font-size: 15px; }

/* ── The conta ─────────────────────────────────────────────────────────── */
.conta {
  background: var(--sheet);
  border-radius: var(--r-lg);
  padding: 4px 16px 4px 12px;
  box-shadow: var(--shadow);
}
.op {
  width: 18px; flex: none; text-align: center;
  font-family: var(--f-num); font-size: 22px; font-weight: 500; line-height: 1;
}
.leader { flex: 1; min-width: 12px; border-bottom: 1.5px dotted var(--rule-strong); transform: translateY(-4px); }
.val { font-size: 17px; font-weight: 500; }

.opening {
  width: 100%; min-height: 64px; text-align: left;
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid var(--rule);
}
.o-text { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 8px 0; min-width: 0; }
.o-label { font-size: 17px; font-weight: 600; white-space: nowrap; }
.o-sub { font-size: 13.5px; color: var(--ink-3); }
.warn .o-sub { color: var(--blue); font-weight: 500; }
/* paddings on the right column line up with the groups' chevrons */
.opening .val { margin-right: 28px; }

.result {
  display: flex; align-items: center; gap: 10px;
  min-height: 64px;
  border-top: 4px double var(--ink);
  margin-top: 2px;
}
.r-label { flex: 1; font-size: 17px; font-weight: 700; }
.result .val { font-size: 20px; font-weight: 650; margin-right: 28px; }

.footnote { font-size: 13.5px; color: var(--ink-3); margin: 14px 4px 0; line-height: 1.45; }
</style>
