import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/onest/index.css'
import '@fontsource-variable/martian-mono/standard.css'
import './style/main.css'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ })
  })
}
