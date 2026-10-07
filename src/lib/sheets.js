import { reactive } from 'vue'

// A stack of open sheets, so one can open on top of another
// (e.g. a purchase opened from inside a card's invoice).
export const sheets = reactive([])
let seq = 0

export function openSheet(type, props = {}) {
  sheets.push({ key: ++seq, type, props })
}

export function closeSheet(key) {
  const i = key ? sheets.findIndex(s => s.key === key) : sheets.length - 1
  if (i >= 0) sheets.splice(i, 1)
}

export function replaceSheet(key, type, props = {}) {
  const i = sheets.findIndex(s => s.key === key)
  if (i >= 0) sheets.splice(i, 1, { key: ++seq, type, props })
  else openSheet(type, props)
}
