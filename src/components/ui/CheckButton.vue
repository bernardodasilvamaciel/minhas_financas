<script setup>
defineProps({
  checked: Boolean,
  label: { type: String, required: true },
})
defineEmits(['toggle'])
</script>

<template>
  <button
    type="button" class="check" role="checkbox"
    :aria-checked="checked" :aria-label="label"
    @click.stop="$emit('toggle')"
  >
    <span class="ring">
      <svg v-if="checked" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  </button>
</template>

<style scoped>
.check {
  width: 44px; height: 44px; flex: none;
  display: grid; place-items: center;
  margin: -6px 0 -6px -10px;
}
.ring {
  width: 26px; height: 26px; border-radius: 50%;
  box-shadow: inset 0 0 0 2px var(--rule-strong);
  display: grid; place-items: center;
  transition: background-color .15s, box-shadow .15s, transform .12s;
}
.check:active .ring { transform: scale(.88); }
.check[aria-checked="true"] .ring { background: var(--blue); box-shadow: none; color: #fff; }
</style>
