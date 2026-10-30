<script setup>
import { computed } from 'vue'
import { useFinance } from '../stores/finance'
import { useFmt } from '../composables/useFmt'
import { cardInvoice, cardIsLight } from '../lib/finance'
import { monthName } from '../lib/months'
import { sum } from '../lib/money'
import { openSheet } from '../lib/sheets'
import CreditCard from './ui/CreditCard.vue'

const store = useFinance()
const { b } = useFmt()

const m = computed(() => store.selected)
const invoices = computed(() => store.data.cards.map(c => cardInvoice(store.data, c, m.value)))
const total = computed(() => sum(invoices.value, i => i.total))
const open = computed(() => sum(invoices.value.filter(i => !i.paid), i => i.total))

function meta(inv) {
  if (inv.override !== null) return 'valor do banco'
  return `${inv.lines.length} ${inv.lines.length === 1 ? 'compra' : 'compras'}`
}
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

    <!-- A wallet: the cards overlap, each one showing its top strip; the last one shows whole. -->
    <ul v-else class="wallet">
      <li
        v-for="inv in invoices" :key="inv.card.id"
        class="slot" :class="{ light: cardIsLight(inv.card.color) }" :style="{ '--card': inv.card.color || '#2B2F36' }"
      >
        <CreditCard
          :name="inv.card.name" :color="inv.card.color"
          :closing-day="inv.card.closingDay" :due-day="inv.card.dueDay"
          :value="b(inv.total)" :meta="meta(inv)"
        />
        <button class="open" :aria-label="`Ver fatura do ${inv.card.name}`" @click="openSheet('invoice', { cardId: inv.card.id })" />
        <button
          class="pay" :aria-pressed="inv.paid" :aria-label="`Fatura ${inv.card.name}: ${inv.paid ? 'paga' : 'marcar como paga'}`"
          @click="store.toggleInvoicePaid(inv.card.id, m)"
        >
          <svg v-if="inv.paid" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          {{ inv.paid ? 'Paga' : 'Marcar paga' }}
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

.wallet {
  --strip: 86px;                                 /* how much of each covered card stays visible */
  list-style: none;
  max-width: 420px; margin: 0 auto 18px;
  container-type: inline-size;
}
.slot { --on: #fff; position: relative; isolation: isolate; }
.slot.light { --on: #14202F; }
/* a card is 1/1.586 of the wallet's width tall; pull each one up over the one before */
.slot + .slot { margin-top: calc(var(--strip) - 100cqw / 1.586); }

.open { position: absolute; inset: 0; border-radius: 18px; }
.open:active { background: rgb(255 255 255 / .07); }

.pay {
  position: absolute; top: 44px; right: 14px; z-index: 1;
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 12px;
  border-radius: 999px;
  font-size: 13px; font-weight: 600;
  color: var(--on);
  background: color-mix(in srgb, var(--on) 14%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--on) 30%, transparent);
  transition: background-color .15s, color .15s, transform .12s;
}
.pay::after { content: ''; position: absolute; inset: -8px -6px; }   /* a finger-sized target */
.pay:active { transform: scale(.94); }
.pay[aria-pressed="true"] { background: var(--on); color: var(--card); box-shadow: none; }

.empty {
  background: var(--sheet); border-radius: var(--r-lg); padding: 22px 18px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 10px;
  box-shadow: var(--shadow);
}
.empty-title { font-family: var(--f-display); font-stretch: 85%; font-size: 20px; font-weight: 700; }
.empty .hint { margin: 0 0 6px; }
</style>
