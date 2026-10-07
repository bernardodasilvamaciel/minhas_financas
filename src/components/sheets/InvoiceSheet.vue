<script setup>
import { ref, computed, watch } from 'vue'
import { useFinance } from '../../stores/finance'
import { useFmt } from '../../composables/useFmt'
import { cardInvoice } from '../../lib/finance'
import { monthName, formatDay } from '../../lib/months'
import { openSheet } from '../../lib/sheets'
import Sheet from '../ui/Sheet.vue'
import MonthPicker from '../ui/MonthPicker.vue'
import MoneyInput from '../ui/MoneyInput.vue'

const props = defineProps({ cardId: { type: String, required: true } })
const emit = defineEmits(['close'])
const store = useFinance()
const { p, b } = useFmt()

const card = computed(() => store.data.cards.find(c => c.id === props.cardId))
// Close if the card disappears (deleted from the edit sheet on top).
watch(card, c => { if (!c) emit('close') })

const month = computed({ get: () => store.selected, set: v => store.select(v) })
const inv = computed(() => card.value ? cardInvoice(store.data, card.value, month.value) : null)

// ── Bank value override ────────────────────────────────────────────────────
const editingTotal = ref(false)
const totalInput = ref(0)
function startEdit() {
  totalInput.value = inv.value.override ?? inv.value.computed
  editingTotal.value = true
}
function saveTotal() {
  store.setInvoiceTotal(card.value.id, month.value, totalInput.value)
  editingTotal.value = false
}
function clearTotal() {
  store.setInvoiceTotal(card.value.id, month.value, null)
  editingTotal.value = false
}
watch(month, () => { editingTotal.value = false })

const diff = computed(() => inv.value && inv.value.override !== null ? inv.value.override - inv.value.computed : 0)

function addPurchase() {
  openSheet('entry', { kind: 'purchase', cardId: card.value.id, invoiceMonth: month.value })
}
function openPurchase(pu) {
  openSheet('entry', { id: pu.id, kind: 'purchase', month: month.value })
}
</script>

<template>
  <Sheet v-if="card && inv" :title="card.name" tall @close="emit('close')">
    <template #head-action>
      <button class="btn btn-ghost btn-sm" @click="openSheet('card', { id: card.id })">Editar</button>
    </template>

    <div class="wrap">
      <MonthPicker v-model="month" />

      <section class="total-box" :style="{ '--card': card.color || 'var(--ink-3)' }">
        <p class="eyebrow">Fatura de {{ monthName(month) }}<template v-if="card.dueDay"> · vence dia {{ card.dueDay }}</template></p>

        <template v-if="!editingTotal">
          <p class="amount num" :class="{ paid: inv.paid }">{{ b(inv.total) }}</p>
          <p class="source">
            <template v-if="inv.override !== null">
              Valor que você pegou no app do banco.
              <template v-if="Math.abs(diff) >= 0.01">
                As compras lançadas aqui somam {{ b(inv.computed) }} ({{ diff > 0 ? 'faltam' : 'sobram' }} {{ b(Math.abs(diff)) }}).
              </template>
            </template>
            <template v-else-if="inv.lines.length">Soma das {{ inv.lines.length }} {{ inv.lines.length === 1 ? 'compra' : 'compras' }} abaixo.</template>
            <template v-else>Nenhuma compra lançada nessa fatura.</template>
          </p>
          <div class="actions">
            <button class="btn btn-sm" :class="inv.paid ? 'btn-blue' : 'btn-ghost'" @click="store.toggleInvoicePaid(card.id, month)">
              <svg v-if="inv.paid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              {{ inv.paid ? 'Paga' : 'Marcar como paga' }}
            </button>
            <button class="btn btn-ghost btn-sm" @click="startEdit">
              {{ inv.override !== null ? 'Mudar valor' : 'Usar valor do banco' }}
            </button>
          </div>
        </template>

        <div v-else class="edit-total">
          <MoneyInput v-model="totalInput" autofocus label="Valor da fatura no app do banco" @enter="saveTotal" />
          <p class="hint">O valor que aparece no app do banco passa a valer no lugar da soma das compras.</p>
          <div class="actions">
            <button class="btn btn-primary btn-sm" @click="saveTotal">Usar este valor</button>
            <button v-if="inv.override !== null" class="btn btn-ghost btn-sm" @click="clearTotal">Voltar para a soma</button>
            <button class="btn btn-ghost btn-sm" @click="editingTotal = false">Cancelar</button>
          </div>
        </div>
      </section>

      <section>
        <div class="list-head">
          <h3 class="eyebrow">Compras nesta fatura</h3>
        </div>
        <ul v-if="inv.lines.length" class="lines">
          <li v-for="l in inv.lines" :key="l.purchase.id">
            <button class="line" @click="openPurchase(l.purchase)">
              <span class="l-text">
                <span class="l-title">{{ l.purchase.description || 'Compra' }}</span>
                <span class="l-sub">
                  <template v-if="l.of > 1">parcela {{ l.index }} de {{ l.of }} · </template>
                  <template v-if="l.purchase.date">{{ formatDay(l.purchase.date) }}</template>
                  <template v-if="l.purchase.person"> · <span class="who">{{ l.purchase.person }}</span></template>
                </span>
              </span>
              <span class="l-val num">{{ p(l.amount) }}</span>
            </button>
          </li>
        </ul>
        <button class="btn btn-ghost btn-block add" @click="addPurchase">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Lançar compra no {{ card.name }}
        </button>
      </section>
    </div>
  </Sheet>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 18px; padding-top: 4px; }
.total-box {
  border-radius: var(--r-md);
  padding: 16px;
  background: var(--paper);
  border-left: 5px solid var(--card);
}
.amount { font-size: 34px; font-weight: 600; letter-spacing: -.03em; margin: 6px 0 4px; }
.amount.paid { color: var(--ink-3); text-decoration: line-through; text-decoration-thickness: 2px; }
.source { font-size: 14px; color: var(--ink-2); line-height: 1.45; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.edit-total { margin-top: 10px; }
.list-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.lines { list-style: none; }
.lines li + li { border-top: 1px dashed var(--rule); }
.line { width: 100%; min-height: 58px; display: flex; align-items: center; gap: 12px; text-align: left; }
.l-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 0; }
.l-title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.l-sub { font-size: 13.5px; color: var(--ink-3); }
.who { color: var(--blue); font-weight: 600; }
.l-val { font-size: 15px; }
.add { margin-top: 10px; }
</style>
