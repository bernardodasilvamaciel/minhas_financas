<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useFinance } from '../../stores/finance'
import { encodeData, qrFrames, isLocalhost } from '../../lib/sync'
import { qrPath } from '../../lib/qr'
import Sheet from '../ui/Sheet.vue'

const emit = defineEmits(['close'])
const store = useFinance()

const frames = ref([])
const index = ref(0)
const paused = ref(false)
let timer = null

const qr = computed(() => frames.value.length ? qrPath(frames.value[index.value]) : null)
const multi = computed(() => frames.value.length > 1)
const local = isLocalhost()

onMounted(async () => {
  frames.value = qrFrames(await encodeData(store.data))
  if (frames.value.length > 1) {
    timer = setInterval(() => {
      if (!paused.value) index.value = (index.value + 1) % frames.value.length
    }, 700)
  }
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Sheet title="QR code" @close="emit('close')">
    <div class="wrap">
      <div class="qr-box" @click="paused = !paused">
        <svg v-if="qr" :viewBox="`-3 -3 ${qr.size + 6} ${qr.size + 6}`" shape-rendering="crispEdges" role="img" :aria-label="multi ? `QR code, parte ${index + 1} de ${frames.length}` : 'QR code'">
          <rect x="-3" y="-3" :width="qr.size + 6" :height="qr.size + 6" fill="#fff" />
          <path :d="qr.path" fill="#000" />
        </svg>
        <div v-else class="loading">Preparando…</div>
      </div>

      <div v-if="multi" class="parts" aria-hidden="true">
        <span v-for="(f, i) in frames" :key="i" class="pip" :class="{ on: i === index }" />
      </div>

      <template v-if="multi">
        <p class="say">São {{ frames.length }} partes, que vão passando sozinhas.</p>
        <p class="hint">
          No celular, abra o app, vá em <b>Dados → Escanear QR code</b> e deixe a câmera parada aqui até completar.
          {{ paused ? 'Pausado — toque no QR para continuar.' : 'Toque no QR para pausar.' }}
        </p>
      </template>
      <template v-else>
        <p class="say">Aponte a câmera do celular.</p>
        <p v-if="local" class="hint">
          Como este computador usa localhost, o link do QR não abre no celular. Leia pelo app no celular: <b>Dados → Escanear QR code</b>.
        </p>
        <p v-else class="hint">
          Pode ser a câmera normal do celular: ela abre o app já com os dados. Ou pelo app: <b>Dados → Escanear QR code</b>.
        </p>
      </template>
    </div>
  </Sheet>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; padding-top: 4px; text-align: center; }
.qr-box {
  width: min(100%, 360px); aspect-ratio: 1;
  background: #fff; border-radius: var(--r-md);
  padding: 10px; display: grid; place-items: center;
  box-shadow: inset 0 0 0 1px var(--rule);
  cursor: pointer;
}
.qr-box svg { width: 100%; height: 100%; }
.loading { color: #778395; }
.parts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.pip { width: 8px; height: 8px; border-radius: 50%; background: var(--rule-strong); transition: background-color .2s, transform .2s; }
.pip.on { background: var(--ink); transform: scale(1.25); }
.say { font-weight: 600; font-size: 17px; }
.hint { margin-top: -6px; }
</style>
