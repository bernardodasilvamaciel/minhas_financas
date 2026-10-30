<script setup>
import { ref } from 'vue'
import { useFinance } from '../../stores/finance'
import Sheet from '../ui/Sheet.vue'
import MoneyInput from '../ui/MoneyInput.vue'

const emit = defineEmits(['close'])
const store = useFinance()
const amount = ref(store.data.balance?.amount || 0)

function save() {
  store.setBalance(amount.value)
  store.notify('Valor atualizado')
  emit('close')
}
</script>

<template>
  <Sheet title="Quanto você tem hoje" @close="emit('close')">
    <div class="wrap">
      <MoneyInput v-model="amount" big autofocus label="Quanto você tem hoje" @enter="save" />
      <p class="hint">
        Some o que está na conta com o que você guardou e pode usar para pagar as contas.
      </p>
      <p class="hint">
        Tudo o que está nas entradas e contas do mês é somado ou descontado deste valor, mesmo marcado como recebido ou pago. Então não inclua aqui o que já está lá.
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
