<script setup>
import { ref } from 'vue'
import { useFinance } from '../../stores/finance'
import { KINDS, itemValue } from '../../lib/finance'
import { monthName } from '../../lib/months'
import { brl } from '../../lib/money'
import { replaceSheet } from '../../lib/sheets'
import Sheet from '../ui/Sheet.vue'
import MoneyInput from '../ui/MoneyInput.vue'

// Asks a recurring item's value for one month: the same as the last one, or a new one.
const props = defineProps({
  id: { type: String, required: true },
  month: { type: String, required: true },
  markDone: Boolean,                               // opened from the check: answering also marks it
  sheetKey: { type: Number, default: null },
})
const emit = defineEmits(['close'])
const store = useFinance()

const item = store.data.items.find(i => i.id === props.id)
const last = itemValue(item, props.month)
const amount = ref(0)

const name = item.kind === 'receivable' ? (item.person || 'Alguém') : (item.description || KINDS[item.kind].short)
const question = { income: 'Quanto entrou', bill: 'Quanto veio', receivable: 'Quanto vai receber' }[item.kind]
const doneWord = item.kind === 'bill' ? 'paga' : 'recebido'

function save(value) {
  if (!value) return
  store.setItemValue(props.id, props.month, value, props.markDone)
  store.notify(`Valor de ${monthName(props.month)} salvo`)
  emit('close')
}

function edit() {
  replaceSheet(props.sheetKey, 'entry', { id: item.id, kind: item.kind, month: props.month })
}
</script>

<template>
  <Sheet :title="name" @close="emit('close')">
    <div class="wrap">
      <p class="q">{{ question }} em {{ monthName(month) }}?</p>

      <button type="button" class="same" @click="save(last.amount)">
        <span class="same-text">
          <span class="same-label">Mesmo valor de {{ monthName(last.from) }}</span>
          <span v-if="markDone" class="same-sub">e marcar como {{ doneWord }}</span>
        </span>
        <span class="same-val num">{{ brl(last.amount) }}</span>
      </button>

      <div class="new">
        <span class="field-label">Ou outro valor</span>
        <MoneyInput v-model="amount" :label="`Valor de ${monthName(month)}`" @enter="save(amount)" />
      </div>

      <button type="button" class="link" @click="edit">Mudar nome ou apagar</button>
    </div>
    <template #footer>
      <button class="btn btn-primary btn-block" :disabled="!amount" @click="save(amount)">
        {{ markDone ? `Salvar e marcar como ${doneWord}` : 'Salvar' }}
      </button>
    </template>
  </Sheet>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 20px; padding-top: 4px; }
.q { font-size: 17px; font-weight: 600; }
.same {
  display: flex; align-items: center; gap: 12px;
  width: 100%; min-height: 64px; padding: 10px 16px;
  border-radius: var(--r-md);
  background: var(--blue-wash);
  text-align: left;
  transition: transform .12s;
}
.same:active { transform: scale(.98); }
.same-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.same-label { font-weight: 600; color: var(--blue); }
.same-sub { font-size: 13.5px; color: var(--ink-3); }
.same-val { font-size: 18px; font-weight: 600; flex: none; }
.new .field-label { margin-bottom: 10px; }
.wrap > .link { align-self: flex-start; font-size: 14px; }
</style>
