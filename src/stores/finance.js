import { defineStore } from 'pinia'
import { ref, reactive, computed, watch } from 'vue'
import { emptyData, uid, projection, dataMonths, defaultInvoiceMonth } from '../lib/finance'
import { loadData, saveData, loadPrefs, savePrefs, normalize } from '../lib/storage'
import { mergeData } from '../lib/sync'
import { monthKey, addMonths, todayISO } from '../lib/months'

const now = () => Date.now()

export const useFinance = defineStore('finance', () => {
  // ── Data ────────────────────────────────────────────────────────────────
  const loaded = loadData()
  const data = ref(loaded.data)
  const migratedFrom = ref(loaded.migratedFrom)
  if (loaded.migratedFrom) saveData(data.value)
  watch(data, d => saveData(d), { deep: true })

  // ── Device preferences (never synced) ───────────────────────────────────
  const storedPrefs = loadPrefs()
  const prefs = reactive({
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    hidden: false,          // hide values
    collapsed: {},          // group id → true
    onboardingDone: false,
    lastBackup: null,
    lastCardId: null,
    ...storedPrefs,
  })
  if (!('theme' in storedPrefs) && loaded.legacyDark !== undefined) prefs.theme = loaded.legacyDark ? 'dark' : 'light'
  watch(prefs, p => savePrefs(p), { deep: true })

  // ── Months ──────────────────────────────────────────────────────────────
  const today = ref(monthKey())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') today.value = monthKey()
  })

  // You spend on credit now and pay next month, so next month is the default view.
  const selected = ref(addMonths(today.value, 1))

  const range = computed(() => {
    const months = dataMonths(data.value)
    let from = addMonths(today.value, -1)
    if (months[0] && months[0] < from) from = months[0] < addMonths(today.value, -12) ? addMonths(today.value, -12) : months[0]
    let to = addMonths(today.value, 11)
    const last = months[months.length - 1]
    if (last && last > to) to = last < addMonths(today.value, 35) ? last : addMonths(today.value, 35)
    return { from, to }
  })

  const proj = computed(() => projection(data.value, range.value.from, range.value.to, today.value))
  const view = computed(() => proj.value[selected.value] || proj.value[today.value])

  function select(m) { selected.value = m }

  // ── Undo & toast ────────────────────────────────────────────────────────
  let snapshot = null
  const toast = ref(null)
  let toastTimer = null

  function checkpoint() { snapshot = JSON.stringify(data.value) }

  function notify(text, { undo = false } = {}) {
    clearTimeout(toastTimer)
    toast.value = { text, undo, id: now() }
    toastTimer = setTimeout(() => { toast.value = null }, undo ? 6000 : 3000)
  }

  function undo() {
    if (!snapshot) return
    data.value = JSON.parse(snapshot)
    snapshot = null
    notify('Desfeito')
  }

  const touch = r => { r.updatedAt = now(); return r }
  const tombstone = id => { data.value.deleted[id] = now() }
  const findCard = id => data.value.cards.find(c => c.id === id)
  const findPurchase = id => data.value.purchases.find(p => p.id === id)
  const findItem = id => data.value.items.find(i => i.id === id)

  // ── Balance ─────────────────────────────────────────────────────────────
  function setBalance(amount) {
    data.value.balance = { amount, date: todayISO(), updatedAt: now() }
  }

  // ── Cards ───────────────────────────────────────────────────────────────
  function addCard({ name, closingDay, dueDay, color }) {
    const card = touch({ id: uid(), name: name.trim(), closingDay: closingDay || null, dueDay: dueDay || null, color, invoices: {} })
    data.value.cards.push(card)
    return card.id
  }

  function updateCard(id, patch) {
    const c = findCard(id)
    if (c) touch(Object.assign(c, patch))
  }

  function removeCard(id) {
    checkpoint()
    for (const p of data.value.purchases) if (p.cardId === id) tombstone(p.id)
    data.value.purchases = data.value.purchases.filter(p => p.cardId !== id)
    data.value.cards = data.value.cards.filter(c => c.id !== id)
    tombstone(id)
  }

  function invoiceOf(card, m) {
    card.invoices ||= {}
    card.invoices[m] ||= { total: null, paid: false }
    return card.invoices[m]
  }

  function setInvoiceTotal(cardId, m, total) {
    const c = findCard(cardId)
    if (!c) return
    invoiceOf(c, m).total = total
    touch(c)
  }

  function toggleInvoicePaid(cardId, m) {
    const c = findCard(cardId)
    if (!c) return
    const inv = invoiceOf(c, m)
    inv.paid = !inv.paid
    touch(c)
  }

  // ── Purchases ───────────────────────────────────────────────────────────
  function addPurchase({ cardId, description, amount, installments, invoiceMonth, person }) {
    checkpoint()
    const card = findCard(cardId)
    data.value.purchases.push(touch({
      id: uid(), cardId, description: description.trim(), amount,
      installments: installments || 1,
      invoiceMonth: invoiceMonth || defaultInvoiceMonth(card),
      date: todayISO(), person: (person || '').trim(), received: {},
    }))
    prefs.lastCardId = cardId
  }

  function updatePurchase(id, patch) {
    const p = findPurchase(id)
    if (!p) return
    if (patch.person !== undefined) patch.person = patch.person.trim()
    touch(Object.assign(p, patch))
  }

  function removePurchase(id) {
    checkpoint()
    data.value.purchases = data.value.purchases.filter(p => p.id !== id)
    tombstone(id)
  }

  function toggleShareReceived(id, m) {
    const p = findPurchase(id)
    if (!p) return
    p.received ||= {}
    if (p.received[m]) delete p.received[m]
    else p.received[m] = true
    touch(p)
  }

  // ── Items: bills, incomes, receivables ──────────────────────────────────
  function addItem({ kind, description, person, amount, month, repeat }) {
    checkpoint()
    data.value.items.push(touch({
      id: uid(), kind, description: (description || '').trim(), person: (person || '').trim(),
      amount, month, repeat: !!repeat, endMonth: null,
      changes: {}, overrides: {}, skips: [], done: {},
    }))
  }

  /**
   * scope only matters for recurring items when the amount changes:
   *  'month'   → just this month
   *  'forward' → this month and every month after
   */
  function updateItem(id, { amount, scope = 'forward', month, itemMonth, ...rest }) {
    const it = findItem(id)
    if (!it) return
    if (itemMonth && itemMonth !== it.month && !it.repeat) {
      if (it.done[it.month]) { delete it.done[it.month]; it.done[itemMonth] = true }
      it.month = itemMonth
    }
    Object.assign(it, rest)
    if (amount !== undefined) {
      if (!it.repeat) {
        it.amount = amount
      } else if (scope === 'month') {
        it.overrides[month] = amount
      } else if (month <= it.month) {
        it.amount = amount
        it.changes = {}
        delete it.overrides[month]
      } else {
        for (const k of Object.keys(it.changes)) if (k > month) delete it.changes[k]
        for (const k of Object.keys(it.overrides)) if (k >= month) delete it.overrides[k]
        it.changes[month] = amount
      }
    }
    touch(it)
  }

  /** scope: 'month' (skip just m) | 'forward' (end before m) | 'all' */
  function removeItem(id, scope = 'all', m) {
    const it = findItem(id)
    if (!it) return
    checkpoint()
    if (scope === 'month' && it.repeat) {
      if (!it.skips.includes(m)) it.skips.push(m)
      delete it.overrides[m]
      touch(it)
      return
    }
    if (scope === 'forward' && it.repeat && m > it.month) {
      it.endMonth = addMonths(m, -1)
      touch(it)
      return
    }
    data.value.items = data.value.items.filter(i => i.id !== id)
    tombstone(id)
  }

  function toggleItemDone(id, m) {
    const it = findItem(id)
    if (!it) return
    if (it.done[m]) delete it.done[m]
    else it.done[m] = true
    touch(it)
  }

  // ── Import / export ─────────────────────────────────────────────────────
  function importData(incoming, mode = 'merge') {
    checkpoint()
    data.value = mode === 'replace' ? normalize(incoming) : mergeData(data.value, normalize(incoming))
  }

  function resetAll() {
    checkpoint()
    data.value = emptyData()
  }

  function backupBlob() {
    const payload = { app: 'minhas-financas', version: 1, exportedAt: new Date().toISOString(), data: data.value }
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  }

  return {
    data, prefs, migratedFrom,
    today, selected, range, proj, view, select,
    toast, notify, undo,
    setBalance,
    addCard, updateCard, removeCard, setInvoiceTotal, toggleInvoicePaid,
    addPurchase, updatePurchase, removePurchase, toggleShareReceived,
    addItem, updateItem, removeItem, toggleItemDone,
    importData, resetAll, backupBlob,
  }
})
