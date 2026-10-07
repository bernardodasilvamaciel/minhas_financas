<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../../stores/finance'
import { CARD_COLORS } from '../../lib/finance'
import Sheet from '../ui/Sheet.vue'

const props = defineProps({ id: { type: String, default: null } })
const emit = defineEmits(['close'])
const store = useFinance()

const card = props.id ? store.data.cards.find(c => c.id === props.id) : null
const name = ref(card?.name || '')
const color = ref(card?.color || CARD_COLORS[store.data.cards.length % CARD_COLORS.length])
const closingDay = ref(card?.closingDay || '')
const dueDay = ref(card?.dueDay || '')

const purchaseCount = computed(() => card ? store.data.purchases.filter(p => p.cardId === card.id).length : 0)

const day = v => {
  const n = parseInt(v, 10)
  return n >= 1 && n <= 31 ? n : null
}

function save() {
  if (!name.value.trim()) return
  const payload = { name: name.value.trim(), color: color.value, closingDay: day(closingDay.value), dueDay: day(dueDay.value) }
  if (card) {
    store.updateCard(card.id, payload)
    store.notify('Cartão salvo')
  } else {
    store.addCard(payload)
    store.notify('Cartão criado. Agora é só lançar as compras pelo +')
  }
  emit('close')
}

const confirmDelete = ref(false)
function remove() {
  store.removeCard(card.id)
  store.notify('Cartão apagado', { undo: true })
  emit('close')
}
</script>

<template>
  <Sheet :title="card ? 'Editar cartão' : 'Novo cartão'" @close="emit('close')">
    <form class="form" @submit.prevent="save">
      <div>
        <label class="field-label" for="card-name">Nome</label>
        <input id="card-name" v-model="name" class="field" placeholder="Nubank, Inter, Itaú…" :autofocus="!card" autocomplete="off">
      </div>

      <div>
        <span class="field-label">Cor</span>
        <div class="swatches" role="radiogroup" aria-label="Cor do cartão">
          <button
            v-for="c in CARD_COLORS" :key="c" type="button" role="radio"
            class="swatch" :style="{ background: c }" :aria-checked="color === c" :aria-label="c"
            @click="color = c"
          />
        </div>
      </div>

      <div class="days">
        <div>
          <label class="field-label" for="closing">Fecha dia</label>
          <input id="closing" v-model="closingDay" class="field num" inputmode="numeric" maxlength="2" placeholder="ex.: 3">
        </div>
        <div>
          <label class="field-label" for="due">Vence dia</label>
          <input id="due" v-model="dueDay" class="field num" inputmode="numeric" maxlength="2" placeholder="ex.: 10">
        </div>
      </div>
      <p class="hint">
        Estão no app do banco. Com eles, cada compra cai sozinha na fatura certa.
        Sem eles, as compras vão para a fatura do mês seguinte.
      </p>

      <div v-if="card" class="danger">
        <button v-if="!confirmDelete" type="button" class="link minus" @click="confirmDelete = true">Apagar cartão</button>
        <div v-else class="confirm">
          <p>Apagar o {{ card.name }}<template v-if="purchaseCount"> e as {{ purchaseCount }} compras dele</template>?</p>
          <div class="confirm-btns">
            <button type="button" class="btn btn-danger btn-sm" @click="remove">Sim, apagar</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="confirmDelete = false">Cancelar</button>
          </div>
        </div>
      </div>
    </form>
    <template #footer>
      <button class="btn btn-primary btn-block" :disabled="!name.trim()" @click="save">{{ card ? 'Salvar' : 'Criar cartão' }}</button>
    </template>
  </Sheet>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 20px; padding-top: 4px; }
.swatches { display: flex; flex-wrap: wrap; gap: 10px; }
.swatch {
  width: 40px; height: 40px; border-radius: 50%;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .25);
  transition: transform .12s;
}
.swatch[aria-checked="true"] { box-shadow: 0 0 0 3px var(--sheet), 0 0 0 5px var(--ink); }
.swatch:active { transform: scale(.92); }
.days { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.hint { margin-top: -10px; }
.danger { border-top: 1px solid var(--rule); padding-top: 14px; }
.confirm p { margin-bottom: 10px; }
.confirm-btns { display: flex; gap: 8px; }
</style>
