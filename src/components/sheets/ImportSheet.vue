<script setup>
import { computed } from 'vue'
import { useFinance } from '../../stores/finance'
import { useFmt } from '../../composables/useFmt'
import Sheet from '../ui/Sheet.vue'

const props = defineProps({
  incoming: { type: Object, required: true },
  source: { type: String, default: '' },
})
const emit = defineEmits(['close'])
const store = useFinance()
const { b } = useFmt()

const theirs = computed(() => ({
  cards: props.incoming.cards.length,
  purchases: props.incoming.purchases.length,
  items: props.incoming.items.length,
  balance: props.incoming.balance,
}))
const localEmpty = computed(() =>
  !store.data.cards.length && !store.data.purchases.length && !store.data.items.length && !store.data.balance)

function apply(mode) {
  store.importData(props.incoming, mode)
  store.prefs.onboardingDone = true
  store.notify(mode === 'merge' ? 'Dados juntados' : 'Dados importados', { undo: true })
  emit('close')
}
</script>

<template>
  <Sheet title="Importar dados" @close="emit('close')">
    <div class="wrap">
      <p class="eyebrow">Chegou<template v-if="source"> pelo {{ source }}</template></p>
      <ul class="counts">
        <li><span class="num">{{ theirs.cards }}</span> cartões</li>
        <li><span class="num">{{ theirs.purchases }}</span> compras</li>
        <li><span class="num">{{ theirs.items }}</span> contas, entradas e valores a receber</li>
        <li v-if="theirs.balance">“Tenho agora”: <span class="num">{{ b(theirs.balance.amount) }}</span></li>
      </ul>

      <template v-if="!localEmpty">
        <div class="option">
          <button class="btn btn-primary btn-block" @click="apply('merge')">Juntar com o que já tenho</button>
          <p class="hint">Fica tudo dos dois aparelhos. Se a mesma coisa foi mudada nos dois, vale a mudança mais recente.</p>
        </div>
        <div class="option">
          <button class="btn btn-ghost btn-block" @click="apply('replace')">Substituir tudo</button>
          <p class="hint">Apaga o que está neste aparelho e fica só com o que chegou.</p>
        </div>
      </template>
      <button v-else class="btn btn-primary btn-block" @click="apply('replace')">Importar</button>
    </div>
  </Sheet>
</template>

<style scoped>
.wrap { padding-top: 4px; display: flex; flex-direction: column; gap: 18px; }
.counts { list-style: none; display: flex; flex-direction: column; gap: 6px; margin-top: -8px; }
.counts li { font-size: 16px; color: var(--ink-2); }
.counts .num { color: var(--ink); font-weight: 600; }
.option .hint { margin-top: 8px; }
</style>
