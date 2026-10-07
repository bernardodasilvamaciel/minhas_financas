import { useFinance } from '../stores/finance'
import { plain, brl } from '../lib/money'

const HIDDEN = '•••••'

/** Money formatters that respect the "hide values" switch. */
export function useFmt() {
  const store = useFinance()
  return {
    p: v => (store.prefs.hidden ? HIDDEN : plain(v)),
    b: v => (store.prefs.hidden ? `R$ ${HIDDEN}` : brl(v)),
    compact(v) {
      if (store.prefs.hidden) return '•••'
      const a = Math.abs(v)
      const sign = v < 0 ? '−' : ''
      if (a < 1000) return sign + Math.round(a)
      const k = a / 1000
      return sign + (k >= 100 ? Math.round(k) : k.toFixed(1).replace('.', ',').replace(',0', '')) + 'k'
    },
  }
}
