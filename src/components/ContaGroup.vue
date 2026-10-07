<script setup>
import CheckButton from './ui/CheckButton.vue'
import { useFmt } from '../composables/useFmt'

defineProps({
  op: { type: String, required: true },          // '+' | '−'
  label: { type: String, required: true },
  total: { type: Number, required: true },
  rows: { type: Array, required: true },         // { key, title, sub, amount, done, color, toggle(), open() }
  collapsed: Boolean,
  progress: { type: String, default: '' },
  addLabel: { type: String, required: true },
  doneWord: { type: String, required: true },    // 'paga', 'recebido'…
})
defineEmits(['toggle-collapse', 'add'])
const { p } = useFmt()
</script>

<template>
  <div class="group">
    <button class="line" :aria-expanded="!collapsed" @click="$emit('toggle-collapse')">
      <span class="op" :class="op === '+' ? 'plus' : 'minus'" aria-hidden="true">{{ op }}</span>
      <span class="label">
        {{ label }}
        <span v-if="progress" class="progress">{{ progress }}</span>
      </span>
      <span class="leader" aria-hidden="true" />
      <span class="val num">{{ p(total) }}</span>
      <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    <ul v-show="!collapsed" class="rows">
      <li v-for="r in rows" :key="r.key" class="row" :class="{ done: r.done }">
        <CheckButton :checked="r.done" :label="`${r.title}: ${r.done ? doneWord : 'marcar como ' + doneWord}`" @toggle="r.toggle()" />
        <button class="row-main" @click="r.open()">
          <span class="row-text">
            <span class="row-title">
              <span v-if="r.color" class="dot" :style="{ background: r.color }" />{{ r.title }}
            </span>
            <span v-if="r.sub || r.done" class="row-sub">
              <template v-if="r.done">{{ doneWord }}<template v-if="r.sub"> · </template></template>{{ r.sub }}
            </span>
          </span>
          <span class="row-val num">{{ p(r.amount) }}</span>
        </button>
      </li>
      <li class="add">
        <button class="link" @click="$emit('add')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          {{ addLabel }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.group + .group { border-top: 1px solid var(--rule); }

.line {
  width: 100%; min-height: 56px;
  display: flex; align-items: center; gap: 10px;
  text-align: left;
}
.op {
  width: 18px; flex: none; text-align: center;
  font-family: var(--f-num); font-size: 22px; font-weight: 500; line-height: 1;
}
.label { font-size: 17px; font-weight: 600; display: flex; align-items: baseline; gap: 8px; white-space: nowrap; }
.progress { font-size: 13px; font-weight: 500; color: var(--ink-3); }
.leader { flex: 1; min-width: 12px; border-bottom: 1.5px dotted var(--rule-strong); transform: translateY(-4px); }
.val { font-size: 17px; font-weight: 500; }
.chev { color: var(--ink-3); flex: none; transition: transform .2s; }
.line[aria-expanded="false"] .chev { transform: rotate(-90deg); }

.rows { list-style: none; padding: 0 0 10px 28px; }
.row { display: flex; align-items: center; gap: 4px; min-height: 52px; }
.row + .row { border-top: 1px dashed var(--rule); }
.row-main {
  flex: 1; min-width: 0; min-height: 52px;
  display: flex; align-items: center; gap: 12px; text-align: left;
}
.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 6px 0; }
.row-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.row-sub { font-size: 13.5px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* the value column lines up with the group totals above (chevron width + gap) */
.row-val { font-size: 15px; color: var(--ink-2); flex: none; margin-right: 28px; }
.done .row-title, .done .row-val { color: var(--ink-3); }
.done .row-val { text-decoration: line-through; text-decoration-thickness: 1.5px; }

.add { padding-top: 2px; }
.add .link { font-size: 15px; min-height: 44px; }
</style>
