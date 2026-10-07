<script setup>
import { ref, computed, onMounted } from 'vue'
import { plain } from '../../lib/money'

// Bank-app style entry: digits fill from the cents up (1 → 0,01 → 0,12 → 1,23).
const model = defineModel({ type: Number, default: 0 })
const props = defineProps({
  autofocus: Boolean,
  big: Boolean,
  label: { type: String, default: 'Valor' },
  id: { type: String, default: () => 'm' + Math.random().toString(36).slice(2, 8) },
})
const emit = defineEmits(['enter'])
const input = ref(null)

const display = computed(() => (model.value ? plain(model.value) : ''))

function onInput(e) {
  const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10)
  model.value = Number(digits || 0) / 100
  e.target.value = display.value
  toEnd()
}

function toEnd() {
  const el = input.value
  if (!el) return
  setTimeout(() => { const n = el.value.length; el.setSelectionRange(n, n) })
}

// A prefilled value gets fully selected, so the first digit typed replaces it.
function selectAll() {
  const el = input.value
  if (el) setTimeout(() => el.select())
}

onMounted(() => {
  if (props.autofocus) input.value?.focus({ preventScroll: true })
})

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="money" :class="{ big }">
    <label :for="id" class="sr">{{ label }}</label>
    <span class="cur" aria-hidden="true">R$</span>
    <input
      :id="id" ref="input"
      class="num"
      type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done"
      placeholder="0,00"
      :value="display"
      @input="onInput" @focus="selectAll"
      @keydown.enter.prevent="emit('enter')"
    >
  </div>
</template>

<style scoped>
.money {
  display: flex; align-items: baseline; gap: 8px;
  padding: 10px 14px;
  border-radius: var(--r-md);
  background: var(--sunken);
  border: 1.5px solid transparent;
  transition: border-color .15s, background-color .15s;
}
.money:focus-within { border-color: var(--blue); background: var(--sheet); }
.cur { font-weight: 600; color: var(--ink-3); font-size: 16px; }
input {
  flex: 1; min-width: 0; width: 100%;
  border: 0; outline: 0; background: transparent;
  font-size: 22px; font-weight: 500; color: var(--ink);
  font-family: var(--f-num);
}
input::placeholder { color: var(--ink-3); opacity: .7; }
.big { padding: 14px 16px; }
.big .cur { font-size: 20px; }
.big input { font-size: 36px; font-weight: 600; letter-spacing: -.03em; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
