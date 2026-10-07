<script setup>
import { computed } from 'vue'
import { useFinance } from '../stores/finance'
import { useFmt } from '../composables/useFmt'
import { cardInvoice } from '../lib/finance'
import { monthName } from '../lib/months'
import { sum } from '../lib/money'
import { openSheet } from '../lib/sheets'
import CheckButton from './ui/CheckButton.vue'

const store = useFinance()
const { p, b } = useFmt()

const m = computed(() => store.selected)
const invoices = computed(() => store.data.cards.map(c => cardInvoice(store.data, c, m.value)))
const total = computed(() => sum(invoices.value, i => i.total))
const open = computed(() => sum(invoices.value.filter(i => !i.paid), i => i.total))
</script>

<template>
  <div class="cards">
    <section class="head">
      <p class="eyebrow">Faturas de {{ monthName(m) }}</p>
      <p class="big num">{{ b(total) }}</p>
      <p v-if="store.data.cards.length" class="sub">
        <template v-if="open === total">Nenhuma paga ainda.</template>
        <template v-else-if="open === 0">Todas pagas.</template>
        <template v-else>Falta pagar {{ b(open) }}.</template>
      </p>
    </section>

    <div v-if="!store.data.cards.length" class="empty">
      <p class="empty-title">Nenhum cartão ainda</p>
      <p class="hint">Cadastre os cartões que você usa. Depois, cada compra lançada pelo botão + cai na fatura certa, já dividida nas parcelas.</p>
      <button class="btn btn-primary" @click="openSheet('card', {})">Adicionar cartão</button>
    </div>

    <ul v-else class="list">
      <li v-for="inv in invoices" :key="inv.card.id" class="item" :style="{ '--card': inv.card.color || 'var(--ink-3)' }" :class="{ paid: inv.paid }">
        <CheckButton :checked="inv.paid" :label="`Fatura ${inv.card.name}: ${inv.paid ? 'paga' : 'marcar como paga'}`" @toggle="store.toggleInvoicePaid(inv.card.id, m)" />
        <button class="main" @click="openSheet('invoice', { cardId: inv.card.id })">
          <span class="text">
            <span class="name">{{ inv.card.name }}</span>
            <span class="meta">
              <template v-if="inv.card.dueDay">vence dia {{ inv.card.dueDay }} · </template>
              <template v-if="inv.override !== null">valor do banco</template>
              <template v-else>{{ inv.lines.length }} {{ inv.lines.length === 1 ? 'compra' : 'compras' }}</template>
              <template v-if="inv.paid"> · paga</template>
            </span>
          </span>
          <span class="val num">{{ p(inv.total) }}</span>
          <svg class="go" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </li>
    </ul>

    <button v-if="store.data.cards.length" class="btn btn-ghost btn-block" @click="openSheet('card', {})">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
      Novo cartão
    </button>
  </div>
</template>

<style scoped>
.head { padding: 12px 0 20px; }
.big {
  font-size: clamp(36px, 11vw, 48px); font-weight: 600; letter-spacing: -.04em;
  margin: 8px 0 6px;
}
.sub { color: var(--ink-2); font-size: 15px; }

.list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.item {
  display: flex; align-items: center; gap: 4px;
  background: var(--sheet);
  border-radius: var(--r-md);
  padding: 6px 12px 6px 18px;
  box-shadow: var(--shadow);
  position: relative; overflow: hidden;
}
.item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--card); }
.main { flex: 1; min-width: 0; min-height: 64px; display: flex; align-items: center; gap: 10px; text-align: left; }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.name { font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { font-size: 13.5px; color: var(--ink-3); }
.val { font-size: 17px; font-weight: 500; }
.paid .val { color: var(--ink-3); text-decoration: line-through; }
.go { color: var(--ink-3); flex: none; }

.empty {
  background: var(--sheet); border-radius: var(--r-lg); padding: 22px 18px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 10px;
  box-shadow: var(--shadow);
}
.empty-title { font-family: var(--f-display); font-stretch: 85%; font-size: 20px; font-weight: 700; }
.empty .hint { margin: 0 0 6px; }
</style>
