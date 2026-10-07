<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useFinance } from '../../stores/finance'
import { KINDS, CARD_COLORS, defaultInvoiceMonth, itemAmount, knownDescriptions, knownPeople } from '../../lib/finance'
import { monthName, addMonths } from '../../lib/months'
import { brl, toCents, fromCents } from '../../lib/money'
import Sheet from '../ui/Sheet.vue'
import MoneyInput from '../ui/MoneyInput.vue'
import MonthPicker from '../ui/MonthPicker.vue'
import Toggle from '../ui/Toggle.vue'

const props = defineProps({
  kind: { type: String, default: 'purchase' },
  id: { type: String, default: null },             // set when editing
  month: { type: String, default: null },          // month the sheet was opened from
  cardId: { type: String, default: null },
  invoiceMonth: { type: String, default: null },
})
const emit = defineEmits(['close'])
const store = useFinance()

const ctxMonth = props.month || store.selected
const editing = !!props.id
const record = editing
  ? (props.kind === 'purchase' ? store.data.purchases : store.data.items).find(r => r.id === props.id)
  : null

// ── Form state ─────────────────────────────────────────────────────────────
const kind = ref(props.kind)
const amount = ref(0)
const description = ref('')
const person = ref('')
const forOther = ref(false)
const month = ref(ctxMonth)
const repeat = ref(kind.value === 'bill' || kind.value === 'income')
const scope = ref('forward')

const cards = computed(() => store.data.cards)
const lastCard = cards.value.find(c => c.id === store.prefs.lastCardId)
const cardId = ref(props.cardId || lastCard?.id || cards.value[0]?.id || null)
const installments = ref(1)
const perInstallment = ref(false)
const invoiceMonth = ref(props.invoiceMonth || defaultInvoiceMonth(cards.value.find(c => c.id === cardId.value)))
let invoiceTouched = !!props.invoiceMonth

if (record && props.kind === 'purchase') {
  amount.value = record.amount
  description.value = record.description
  cardId.value = record.cardId
  installments.value = record.installments
  invoiceMonth.value = record.invoiceMonth
  invoiceTouched = true
  person.value = record.person
  forOther.value = !!record.person
} else if (record) {
  amount.value = itemAmount(record, ctxMonth)
  description.value = record.description
  person.value = record.person
  month.value = record.repeat ? ctxMonth : record.month
  repeat.value = record.repeat
}
const originalAmount = amount.value

watch(kind, k => { repeat.value = k === 'bill' || k === 'income' })
watch(cardId, id => {
  if (!invoiceTouched) invoiceMonth.value = defaultInvoiceMonth(cards.value.find(c => c.id === id))
})
function touchInvoice(v) { invoiceMonth.value = v; invoiceTouched = true }

// ── Derived ────────────────────────────────────────────────────────────────
const selectedCard = computed(() => cards.value.find(c => c.id === cardId.value))
const total = computed(() =>
  kind.value === 'purchase' && perInstallment.value ? fromCents(toCents(amount.value) * installments.value) : amount.value)
const installmentValue = computed(() => fromCents(Math.floor(toCents(total.value) / installments.value)))
const isRecurringEdit = editing && kind.value !== 'purchase' && record?.repeat
const amountChanged = computed(() => toCents(amount.value) !== toCents(originalAmount))

const suggestions = computed(() => knownDescriptions(store.data, kind.value))
const people = computed(() => knownPeople(store.data))

const canSave = computed(() => amount.value > 0 && (kind.value !== 'purchase' || !!cardId.value))

const title = editing ? KINDS[kind.value].label : 'Adicionar'
const saveLabel = computed(() => {
  if (editing) return 'Salvar'
  return { purchase: 'Lançar compra', bill: 'Adicionar conta', income: 'Adicionar entrada', receivable: 'Adicionar' }[kind.value]
})

const placeholders = {
  purchase: 'Mercado, farmácia, iFood…',
  bill: 'Aluguel, luz, internet…',
  income: 'Salário, freela…',
  receivable: 'Do quê? (opcional)',
}
const monthLabel = computed(() => {
  if (kind.value === 'bill') return repeat.value ? 'A partir de' : 'Vence em'
  if (kind.value === 'income') return repeat.value ? 'A partir de' : 'Entra em'
  return 'Para quando'
})

// ── New card inline (so a first purchase never dead-ends) ──────────────────
const newCardOpen = ref(cards.value.length === 0)
const newCardName = ref('')
function createCard() {
  const name = newCardName.value.trim()
  if (!name) return
  const id = store.addCard({ name, color: CARD_COLORS[cards.value.length % CARD_COLORS.length] })
  cardId.value = id
  newCardName.value = ''
  newCardOpen.value = false
}

// ── Save / delete ──────────────────────────────────────────────────────────
const descInput = ref(null)
function focusDescription() { nextTick(() => descInput.value?.focus()) }

function submit() {
  if (!canSave.value) return
  const desc = description.value.trim()

  if (kind.value === 'purchase') {
    const payload = {
      cardId: cardId.value, description: desc || 'Compra', amount: total.value,
      installments: installments.value, invoiceMonth: invoiceMonth.value,
      person: forOther.value ? (person.value.trim() || 'Outra pessoa') : '',
    }
    if (editing) {
      store.updatePurchase(record.id, payload)
      store.notify('Compra salva')
    } else {
      store.addPurchase(payload)
      const where = installments.value > 1 ? `de ${monthName(invoiceMonth.value)} a ${monthName(addMonths(invoiceMonth.value, installments.value - 1))}` : `na fatura de ${monthName(invoiceMonth.value)}`
      store.notify(`Compra lançada ${where}`, { undo: true })
    }
  } else {
    const who = kind.value === 'receivable' ? (person.value.trim() || 'Alguém') : ''
    if (editing) {
      store.updateItem(record.id, {
        description: desc, person: who,
        amount: amountChanged.value ? amount.value : undefined,
        scope: scope.value, month: ctxMonth,
        itemMonth: record.repeat ? undefined : month.value,
        ...(record.repeat ? {} : { repeat: repeat.value }),
      })
      store.notify('Salvo')
    } else {
      store.addItem({
        kind: kind.value, description: desc || (kind.value === 'receivable' ? '' : KINDS[kind.value].short),
        person: who, amount: amount.value, month: month.value, repeat: repeat.value,
      })
      store.notify(repeat.value ? `Entra na conta todo mês a partir de ${monthName(month.value)}` : `Adicionado em ${monthName(month.value)}`, { undo: true })
    }
  }
  emit('close')
}

const confirmDelete = ref(false)
function remove(scopeChoice = 'all') {
  if (kind.value === 'purchase') store.removePurchase(record.id)
  else store.removeItem(record.id, scopeChoice, ctxMonth)
  store.notify('Apagado', { undo: true })
  emit('close')
}
</script>

<template>
  <Sheet :title="title" @close="emit('close')">
    <form class="form" @submit.prevent="submit">
      <div v-if="!editing" class="chips kinds" role="radiogroup" aria-label="Tipo">
        <button
          v-for="(k, key) in KINDS" :key="key" type="button"
          class="chip" role="radio" :aria-checked="kind === key"
          @click="kind = key"
        >{{ k.short }}</button>
      </div>

      <div class="field-block">
        <MoneyInput
          v-model="amount" big :autofocus="!editing"
          :label="kind === 'purchase' && perInstallment ? 'Valor da parcela' : 'Valor'"
          @enter="focusDescription"
        />
        <div v-if="kind === 'purchase' && installments > 1" class="split">
          <span class="num">{{ perInstallment ? `Total ${brl(total)}` : `${installments}x de ${brl(installmentValue)}` }}</span>
          <button type="button" class="link" @click="perInstallment = !perInstallment">
            {{ perInstallment ? 'Digitar o total' : 'Digitar o valor da parcela' }}
          </button>
        </div>
      </div>

      <!-- Who (receivable) -->
      <div v-if="kind === 'receivable'" class="field-block">
        <label class="field-label" for="who">Quem te deve</label>
        <input id="who" v-model="person" class="field" list="people-list" autocomplete="off" placeholder="Nome" enterkeyhint="next">
      </div>

      <div class="field-block">
        <label class="field-label" for="desc">{{ kind === 'receivable' ? 'Descrição' : 'Nome' }}</label>
        <input
          id="desc" ref="descInput" v-model="description" class="field"
          list="desc-list" autocomplete="off" :placeholder="placeholders[kind]"
          enterkeyhint="done" @keydown.enter.prevent="submit"
        >
        <datalist id="desc-list"><option v-for="d in suggestions" :key="d" :value="d" /></datalist>
        <datalist id="people-list"><option v-for="n in people" :key="n" :value="n" /></datalist>
      </div>

      <!-- Purchase -->
      <template v-if="kind === 'purchase'">
        <div class="field-block">
          <span class="field-label">Cartão</span>
          <div class="chips">
            <button
              v-for="c in cards" :key="c.id" type="button"
              class="chip" :aria-pressed="c.id === cardId" @click="cardId = c.id"
            >
              <span class="dot" :style="{ background: c.color || 'var(--ink-3)' }" />{{ c.name }}
            </button>
            <button v-if="!newCardOpen" type="button" class="chip ghost" @click="newCardOpen = true">+ Novo cartão</button>
          </div>
          <div v-if="newCardOpen" class="new-card">
            <input v-model="newCardName" class="field" placeholder="Nome do cartão (ex.: Nubank)" @keydown.enter.prevent="createCard">
            <button type="button" class="btn btn-primary btn-sm" :disabled="!newCardName.trim()" @click="createCard">Criar</button>
          </div>
        </div>

        <div class="field-block row-2">
          <div>
            <span class="field-label">Parcelas</span>
            <div class="stepper">
              <button type="button" aria-label="Menos parcelas" :disabled="installments <= 1" @click="installments--">−</button>
              <output class="num" aria-live="polite">{{ installments }}x</output>
              <button type="button" aria-label="Mais parcelas" :disabled="installments >= 48" @click="installments++">+</button>
            </div>
          </div>
          <div>
            <span class="field-label">{{ installments > 1 ? '1ª parcela na fatura de' : 'Entra na fatura de' }}</span>
            <MonthPicker :model-value="invoiceMonth" @update:model-value="touchInvoice" />
          </div>
        </div>
        <p v-if="selectedCard" class="hint tight">
          <template v-if="selectedCard.closingDay">O {{ selectedCard.name }} fecha dia {{ selectedCard.closingDay }}, por isso essa fatura.</template>
          <template v-else>Sem dia de fechamento cadastrado, a compra vai para a fatura do mês que vem.</template>
        </p>

        <div class="field-block">
          <Toggle v-model="forOther" label="Foi para outra pessoa" hint="Ela te paga de volta: entra em “Me devem”" />
          <input v-if="forOther" v-model="person" class="field" list="people-list" autocomplete="off" placeholder="Nome de quem vai te pagar">
        </div>
      </template>

      <!-- Bills, incomes, receivables -->
      <template v-else>
        <div v-if="!isRecurringEdit" class="field-block">
          <span class="field-label">{{ monthLabel }}</span>
          <MonthPicker v-model="month" />
        </div>
        <div v-if="!isRecurringEdit" class="field-block">
          <Toggle v-model="repeat" label="Repete todo mês" :hint="kind === 'income' ? 'Como salário' : kind === 'bill' ? 'Como aluguel e internet' : ''" />
        </div>
        <div v-if="isRecurringEdit && amountChanged" class="field-block">
          <span class="field-label">Mudar o valor</span>
          <div class="chips">
            <button type="button" class="chip" :aria-pressed="scope === 'month'" @click="scope = 'month'">Só em {{ monthName(ctxMonth) }}</button>
            <button type="button" class="chip" :aria-pressed="scope === 'forward'" @click="scope = 'forward'">De {{ monthName(ctxMonth) }} em diante</button>
          </div>
        </div>
        <p v-if="isRecurringEdit" class="hint tight">Repete todo mês desde {{ monthName(record.month) }}.</p>
      </template>

      <!-- Delete -->
      <div v-if="editing" class="danger">
        <button v-if="!confirmDelete" type="button" class="link minus" @click="confirmDelete = true">
          {{ kind === 'purchase' ? 'Apagar compra' : 'Apagar' }}
        </button>
        <div v-else class="confirm">
          <template v-if="isRecurringEdit">
            <button type="button" class="btn btn-danger btn-sm" @click="remove('month')">Tirar só de {{ monthName(ctxMonth) }}</button>
            <button type="button" class="btn btn-danger btn-sm" @click="remove('forward')">
              {{ ctxMonth <= record.month ? 'Apagar de todos os meses' : `Parar a partir de ${monthName(ctxMonth)}` }}
            </button>
          </template>
          <button v-else type="button" class="btn btn-danger btn-sm" @click="remove()">
            Sim, apagar{{ kind === 'purchase' && installments > 1 ? ` as ${installments} parcelas` : '' }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" @click="confirmDelete = false">Cancelar</button>
        </div>
      </div>
    </form>

    <template #footer>
      <button class="btn btn-primary btn-block" :disabled="!canSave" @click="submit">{{ saveLabel }}</button>
    </template>
  </Sheet>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 20px; padding-top: 4px; }
.kinds { flex-wrap: nowrap; gap: 6px; }
.kinds .chip { flex: 1 1 auto; justify-content: center; min-width: 0; padding: 0 6px; font-size: 14.5px; white-space: nowrap; }
.field-block { display: flex; flex-direction: column; gap: 10px; }
.field-block > .field-label { margin-bottom: -2px; }
.split { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 15px; color: var(--ink-2); }
.split .link { font-size: 14px; padding: 4px 0; }
.chip.ghost { background: transparent; box-shadow: inset 0 0 0 1.5px var(--rule-strong); }
.new-card { display: flex; gap: 8px; align-items: center; }
.row-2 { display: grid; grid-template-columns: auto 1fr; gap: 14px; }
.row-2 .field-label { margin-bottom: 8px; }
.stepper { display: flex; align-items: center; background: var(--sunken); border-radius: 999px; padding: 4px; }
.stepper button { width: 42px; height: 42px; border-radius: 50%; font-size: 22px; color: var(--ink-2); }
.stepper button:active { background: var(--sheet); }
.stepper button:disabled { opacity: .3; }
.stepper output { min-width: 40px; text-align: center; font-weight: 600; }
.hint.tight { margin-top: -10px; }
.danger { padding-top: 4px; border-top: 1px solid var(--rule); }
.danger .link { padding-top: 14px; }
.confirm { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 14px; }
</style>
