<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createFrameCollector, decodeCode } from '../../lib/sync'
import { replaceSheet, openSheet } from '../../lib/sheets'
import Sheet from '../ui/Sheet.vue'

const props = defineProps({ sheetKey: { type: Number, default: null } })
const emit = defineEmits(['close'])

const video = ref(null)
const state = ref('starting')      // starting | scanning | decoding | error
const message = ref('')
const notice = ref('')
const got = ref(0)
const total = ref(0)
const parts = ref([])

const collector = createFrameCollector()
let stream = null
let raf = 0
let detector = null
let jsQR = null
let canvas = null
let ctx = null
let last = 0
let busy = false
let stopped = false

function stop() {
  stopped = true
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach(t => t.stop())
}

async function start() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    state.value = 'error'
    message.value = 'O navegador só libera a câmera quando o app é aberto por https. Por aqui, use “Colar código”.'
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
  } catch (e) {
    state.value = 'error'
    message.value = e?.name === 'NotAllowedError'
      ? 'A câmera foi bloqueada. Libere o acesso à câmera para este site nas configurações do navegador e tente de novo.'
      : 'Não deu para abrir a câmera deste aparelho.'
    return
  }
  if (stopped) return stop()
  video.value.srcObject = stream
  await video.value.play().catch(() => {})

  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats()
      if (formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    } catch { detector = null }
  }
  if (!detector) {
    jsQR = (await import('jsqr')).default
    canvas = document.createElement('canvas')
    ctx = canvas.getContext('2d', { willReadFrequently: true })
  }
  state.value = 'scanning'
  loop()
}

async function readFrame(v) {
  if (detector) return (await detector.detect(v)).map(c => c.rawValue)
  const scale = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight))
  const w = Math.round(v.videoWidth * scale)
  const h = Math.round(v.videoHeight * scale)
  canvas.width = w
  canvas.height = h
  ctx.drawImage(v, 0, 0, w, h)
  const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
  return found ? [found.data] : []
}

async function loop() {
  if (stopped) return
  raf = requestAnimationFrame(loop)
  const now = performance.now()
  const v = video.value
  if (busy || now - last < 110 || !v || v.readyState < 2) return
  last = now
  busy = true
  try {
    for (const text of await readFrame(v)) await handle(text)
  } catch { /* a bad frame is fine, try the next one */ } finally {
    busy = false
  }
}

async function handle(text) {
  if (stopped) return
  const before = collector.received
  const r = collector.push(text)
  if (r.unknown) { notice.value = 'Esse QR code não é do app.'; return }
  notice.value = ''
  got.value = collector.received
  total.value = collector.total
  parts.value = collector.parts.map(Boolean)
  if (collector.received > before) navigator.vibrate?.(25)
  if (!r.done) return
  stop()
  state.value = 'decoding'
  try {
    const incoming = await decodeCode(r.code)
    if (props.sheetKey) replaceSheet(props.sheetKey, 'import', { incoming, source: 'QR code' })
    else openSheet('import', { incoming, source: 'QR code' })
  } catch (e) {
    state.value = 'error'
    message.value = e?.message || 'Não deu para ler os dados do QR code.'
  }
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <Sheet title="Escanear QR code" @close="emit('close')">
    <div class="wrap">
      <div v-if="state !== 'error'" class="viewfinder">
        <video ref="video" playsinline muted autoplay />
        <div class="frame" aria-hidden="true" />
        <p v-if="state === 'starting'" class="over">Abrindo a câmera…</p>
        <p v-if="state === 'decoding'" class="over">Lendo os dados…</p>
      </div>

      <div v-if="state === 'error'" class="error">
        <p>{{ message }}</p>
        <button class="btn btn-ghost" @click="replaceSheet(props.sheetKey, 'paste')">Colar código</button>
      </div>

      <template v-else>
        <div v-if="total > 1" class="progress" :aria-label="`${got} de ${total} partes`">
          <span v-for="(ok, i) in parts" :key="i" class="pip" :class="{ on: ok }" />
        </div>
        <p class="say">
          <template v-if="total > 1">{{ got }} de {{ total }} partes. Continue apontando.</template>
          <template v-else>Aponte para o QR code na tela do outro aparelho.</template>
        </p>
        <p v-if="notice" class="hint minus">{{ notice }}</p>
      </template>
    </div>
  </Sheet>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; padding-top: 4px; text-align: center; }
.viewfinder {
  position: relative; width: 100%; aspect-ratio: 1; max-width: 420px;
  border-radius: var(--r-md); overflow: hidden; background: #000;
}
video { width: 100%; height: 100%; object-fit: cover; }
.frame {
  position: absolute; inset: 12%;
  border-radius: 18px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, .35), inset 0 0 0 3px rgba(255, 255, 255, .9);
}
.over { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-weight: 600; }
.progress { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.pip { width: 10px; height: 10px; border-radius: 50%; background: var(--rule-strong); transition: background-color .2s; }
.pip.on { background: var(--blue); }
.say { font-weight: 600; }
.error { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 12px 0; color: var(--ink-2); }
</style>
