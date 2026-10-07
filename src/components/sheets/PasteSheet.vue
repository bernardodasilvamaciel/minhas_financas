<script setup>
import { ref } from 'vue'
import { extractCode, decodeCode } from '../../lib/sync'
import { replaceSheet, openSheet } from '../../lib/sheets'
import Sheet from '../ui/Sheet.vue'

const props = defineProps({ sheetKey: { type: Number, default: null } })
const emit = defineEmits(['close'])

const text = ref('')
const error = ref('')
const busy = ref(false)
const canRead = !!navigator.clipboard?.readText && window.isSecureContext

async function pasteFromClipboard() {
  try {
    text.value = await navigator.clipboard.readText()
    error.value = ''
  } catch {
    error.value = 'O navegador não deixou ler a área de transferência. Toque no campo e cole.'
  }
}

async function read() {
  const code = extractCode(text.value)
  if (!code) {
    error.value = 'Não achei um código aqui. Ele começa com MF1. — cole o link ou o código inteiro.'
    return
  }
  busy.value = true
  try {
    const incoming = await decodeCode(code)
    if (props.sheetKey) replaceSheet(props.sheetKey, 'import', { incoming, source: 'código' })
    else openSheet('import', { incoming, source: 'código' })
  } catch (e) {
    error.value = e?.message?.includes('Código') ? e.message : 'O código está incompleto ou foi alterado. Copie de novo no outro aparelho.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Sheet title="Colar código" @close="emit('close')">
    <div class="wrap">
      <label class="field-label" for="code">Link ou código</label>
      <textarea id="code" v-model="text" class="field num code" spellcheck="false" autocomplete="off" placeholder="https://…#importar=MF1.… ou MF1.…" />
      <button v-if="canRead" class="link" @click="pasteFromClipboard">Colar da área de transferência</button>
      <p v-if="error" class="hint minus">{{ error }}</p>
      <p v-else class="hint">No outro aparelho, em Dados, toque em “Copiar código” ou “Enviar link”.</p>
    </div>
    <template #footer>
      <button class="btn btn-primary btn-block" :disabled="!text.trim() || busy" @click="read">Ler dados</button>
    </template>
  </Sheet>
</template>

<style scoped>
.wrap { padding-top: 4px; }
.code { font-size: 13px; min-height: 140px; word-break: break-all; }
</style>
