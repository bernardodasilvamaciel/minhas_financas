<script setup>
import { ref } from 'vue'
import { useFinance } from '../../stores/finance'
import { formatDay } from '../../lib/months'
import Sheet from '../ui/Sheet.vue'
import MoneyInput from '../ui/MoneyInput.vue'

const emit = defineEmits(['close'])
const store = useFinance()
const b = store.data.balance
const amount = ref(b?.amount || 0)
// A value from an earlier month is corrected in place: that's where the running balance starts.
const title = b?.date && store.start < store.today ? `Quanto você tinha em ${formatDay(b.date)}` : 'Quanto você tem hoje'

function save() {
  store.setBalance(amount.value)
  store.notify('Valor atualizado')
  emit('close')
}
</script>

<template>
  <Sheet :title="title" @close="emit('close')">
    <div class="wrap">
      <MoneyInput v-model="amount" big autofocus :label="title" @enter="save" />
      <p class="hint">
        Some o que está na conta com o que você guardou e pode usar para pagar as contas.
      </p>
      <p class="hint">
        Tudo o que está nas entradas e contas do mês é somado ou descontado deste valor, mesmo marcado como recebido ou pago. Então não inclua aqui o que já está lá.
      </p>
      <p class="hint">
        Basta informar uma vez: daqui em diante, cada mês começa com o que sobrou do anterior.
      </p>
    </div>
    <template #footer>
      <button class="btn btn-primary btn-block" @click="save">Salvar</button>
    </template>
  </Sheet>
</template>

<style scoped>
.wrap { padding-top: 4px; }
</style>
