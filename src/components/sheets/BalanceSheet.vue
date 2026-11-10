<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../../stores/finance'
import { monthName, addMonths } from '../../lib/months'
import { brl, toCents, fromCents } from '../../lib/money'
import Sheet from '../ui/Sheet.vue'
import MoneyInput from '../ui/MoneyInput.vue'

// How a month opens: with what the month before left, or with a value of its own, in the bank and/or in cash.
const props = defineProps({ month: { type: String, required: true } })
const emit = defineEmits(['close'])
const store = useFinance()

const own = store.data.openings[props.month]
// Only months after the first one with a value have something left from before.
const carried = store.proj[props.month]?.carried ?? null
const prevName = monthName(addMonths(props.month, -1))
const isNow = props.month === store.today

const bank = ref(own?.bank || 0)
const cash = ref(own?.cash || 0)
const total = computed(() => fromCents(toCents(bank.value) + toCents(cash.value)))

const title = isNow ? 'Quanto você tem agora' : `Começo de ${monthName(props.month)}`

function useCarried() {
  store.clearOpening(props.month)
  const name = monthName(props.month)
  store.notify(`${name[0].toUpperCase() + name.slice(1)} começa com o que ${carried < 0 ? 'faltou' : 'sobrou'} de ${prevName}`)
  emit('close')
}

function save() {
  if (!bank.value && !cash.value) return
  store.setOpening(props.month, { bank: bank.value, cash: cash.value })
  store.notify('Valor atualizado')
  emit('close')
}
</script>

<template>
  <Sheet :title="title" @close="emit('close')">
    <div class="wrap">
      <template v-if="carried !== null">
        <p class="q">Como {{ monthName(month) }} começa?</p>
        <button type="button" class="same" :aria-pressed="!own" @click="useCarried">
          <span class="same-text">
            <span class="same-label">O que {{ carried < 0 ? 'faltou' : 'sobrou' }} de {{ prevName }}</span>
            <span class="same-sub">{{ own ? 'A conta segue do mês anterior' : 'É o que está valendo' }}</span>
          </span>
          <span class="same-val num" :class="{ minus: carried < 0 }">{{ brl(carried) }}</span>
        </button>
      </template>

      <div class="own">
        <p v-if="carried !== null" class="field-label">Ou outro valor</p>
        <div class="pair">
          <div>
            <span class="field-label sub" aria-hidden="true">No banco</span>
            <MoneyInput v-model="bank" label="No banco" :autofocus="carried === null" @enter="save" />
          </div>
          <div>
            <span class="field-label sub" aria-hidden="true">Em espécie</span>
            <MoneyInput v-model="cash" label="Em espécie" @enter="save" />
          </div>
        </div>
        <p v-if="bank && cash" class="sum">Total <span class="num">{{ brl(total) }}</span></p>
      </div>

      <p class="hint">
        No banco vai o saldo da conta e o que está guardado e pode usar para pagar as contas. Em espécie, o dinheiro vivo.
      </p>
      <p class="hint">
        Tudo o que está nas entradas e contas do mês é somado ou descontado deste valor, mesmo marcado como recebido ou pago. Então não inclua aqui o que já está lá.
      </p>
    </div>
    <template #footer>
      <button class="btn btn-primary btn-block" :disabled="!bank && !cash" @click="save">
        {{ carried !== null ? 'Usar este valor' : 'Salvar' }}
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
  transition: transform .12s, box-shadow .15s;
}
.same[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--blue); }
.same:active { transform: scale(.98); }
.same-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.same-label { font-weight: 600; color: var(--blue); }
.same-sub { font-size: 13.5px; color: var(--ink-3); }
.same-val { font-size: 18px; font-weight: 600; flex: none; }
.own > .field-label { margin-bottom: 10px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field-label.sub { display: block; margin-bottom: 6px; font-size: 13.5px; }
.sum { margin-top: 10px; font-size: 15px; color: var(--ink-2); display: flex; justify-content: space-between; }
.sum .num { color: var(--ink); font-weight: 600; }
.wrap > .hint { margin-top: -6px; }
</style>
