import { addMonths, diffMonths, monthKey, monthRange } from './months'
import { toCents, fromCents, sum } from './money'

/*
  Data shape (v1)
  ───────────────
  balance:   { amount, date, updatedAt } | null      — "Tenho agora"
  cards:     { id, name, closingDay, dueDay, color, invoices: { [month]: { total, paid } }, updatedAt }
  purchases: { id, cardId, description, amount, installments, invoiceMonth, date, person, received: { [month]: true }, updatedAt }
             amount is the full price; it is split across `installments` invoices starting at invoiceMonth.
  items:     { id, kind: 'income' | 'bill' | 'receivable', description, person, amount, month, repeat, endMonth,
               changes: { [month]: amount },   — (older data) new value from that month on
               overrides: { [month]: amount }, — the value given for that month (recurring only)
               skips: [month], done: { [month]: true }, updatedAt }
  deleted:   { [id]: timestamp }                     — tombstones, so merging two devices doesn't resurrect deletions

  A recurring item's value can change every month: a month without a value of its own
  repeats the latest one before it, and the app asks to confirm it once the month arrives.
  Marking something as paid/received is only a checklist: it never changes the totals.
*/

export const KINDS = {
  purchase:   { label: 'Compra no cartão', short: 'Cartão' },
  bill:       { label: 'Conta a pagar', short: 'Conta' },
  income:     { label: 'Entrada', short: 'Entrada' },
  receivable: { label: 'Alguém me deve', short: 'Me devem' },
}

export const CARD_COLORS = ['#6D3FD1', '#E2552F', '#1F7A5A', '#1F4FD1', '#C2185B', '#2B2F36', '#D49A00', '#00838F']

/** Light card colors (gold, orange) need dark text on top of them; the rest take white. */
export function cardIsLight(hex) {
  const m = /^#([\da-f]{6})$/i.exec(hex || '')
  if (!m) return false
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.2
}

export const uid = () =>
  Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7)

export function emptyData() {
  return { v: 1, balance: null, cards: [], purchases: [], items: [], deleted: {} }
}

// ── Items (bills, incomes, receivables) ──────────────────────────────────

export function itemOccurs(item, m) {
  if (m < item.month) return false
  if (item.skips?.includes(m)) return false
  if (!item.repeat) return m === item.month
  return !item.endMonth || m <= item.endMonth
}

/** The value for month m, and the month it comes from (m itself, or the latest one before it). */
export function itemValue(item, m) {
  const overrides = item.overrides || {}
  if (m in overrides) return { amount: overrides[m], from: m }
  let amount = item.amount, from = item.month
  for (const [k, v] of Object.entries(item.changes || {})) if (k <= m && k > from) { amount = v; from = k }
  for (const [k, v] of Object.entries(overrides)) if (k < m && k >= from) { amount = v; from = k }
  return { amount, from }
}

export const itemAmount = (item, m) => itemValue(item, m).amount

/** Whether the value for month m was typed or accepted, rather than repeated from an earlier month. */
export function itemConfirmed(item, m) {
  return !item.repeat || m === item.month || m in (item.overrides || {}) || m in (item.changes || {}) || !!item.done?.[m]
}

// ── Cards & purchases ────────────────────────────────────────────────────

/** Which invoice (by due month) a purchase made on `dateISO` lands in. */
export function defaultInvoiceMonth(card, dateISO) {
  const d = dateISO ? new Date(dateISO + 'T12:00:00') : new Date()
  const key = monthKey(d)
  if (!card?.closingDay) return addMonths(key, 1)
  const closing = card.closingDay
  const closesIn = d.getDate() >= closing ? addMonths(key, 1) : key
  const due = card.dueDay || ((closing + 7 - 1) % 31) + 1
  return due > closing ? closesIn : addMonths(closesIn, 1)
}

/** The slice of a purchase that falls in month m, or null. */
export function purchaseShare(p, m) {
  const n = Math.max(1, p.installments || 1)
  const k = diffMonths(p.invoiceMonth, m)
  if (k < 0 || k >= n) return null
  const total = toCents(p.amount)
  const base = Math.floor(total / n)
  const cents = k === 0 ? total - base * (n - 1) : base
  return { amount: fromCents(cents), index: k + 1, of: n }
}

export function lastPurchaseMonth(p) {
  return addMonths(p.invoiceMonth, Math.max(1, p.installments || 1) - 1)
}

export function cardInvoice(data, card, m) {
  const lines = []
  for (const p of data.purchases) {
    if (p.cardId !== card.id) continue
    const share = purchaseShare(p, m)
    if (share) lines.push({ purchase: p, ...share })
  }
  lines.sort((a, b) => (b.purchase.date || '').localeCompare(a.purchase.date || ''))
  const computed = sum(lines, l => l.amount)
  const inv = card.invoices?.[m] || {}
  const override = typeof inv.total === 'number' ? inv.total : null
  return {
    card, month: m, lines, computed, override,
    total: override ?? computed,
    paid: !!inv.paid,
  }
}

// ── Month summary ────────────────────────────────────────────────────────

export function monthSummary(data, m) {
  const incomes = [], bills = [], owed = []

  for (const item of data.items) {
    if (!itemOccurs(item, m)) continue
    const { amount, from } = itemValue(item, m)
    const row = { type: 'item', item, amount, from, estimated: !itemConfirmed(item, m), done: !!item.done?.[m] }
    if (item.kind === 'income') incomes.push(row)
    else if (item.kind === 'bill') bills.push(row)
    else owed.push(row)
  }

  const cardsById = Object.fromEntries(data.cards.map(c => [c.id, c]))
  for (const p of data.purchases) {
    if (!p.person) continue
    const share = purchaseShare(p, m)
    if (!share) continue
    owed.push({
      type: 'share', purchase: p, card: cardsById[p.cardId], ...share,
      done: !!p.received?.[m],
    })
  }

  const invoices = data.cards
    .map(c => cardInvoice(data, c, m))
    .filter(inv => inv.total > 0 || inv.override !== null)

  const byAmountDesc = (a, b) => b.amount - a.amount
  incomes.sort(byAmountDesc); bills.sort(byAmountDesc); owed.sort(byAmountDesc)

  const all = list => sum(list, r => r.amount)

  return {
    month: m,
    incomes, bills, owed, invoices,
    all: {
      incomes: all(incomes), owed: all(owed), bills: all(bills),
      invoices: sum(invoices, i => i.total),
    },
  }
}

/**
 * Month-by-month projection.
 * Past months show their own result (in − out). From the current month on,
 * the balance carries over: opening + in − out = closing.
 */
export function projection(data, from, to, today = monthKey()) {
  const rows = {}
  let carry = data.balance?.amount || 0
  for (const m of monthRange(from < today ? from : today, to)) {
    const s = monthSummary(data, m)
    const result = fromCents(
      toCents(s.all.incomes) + toCents(s.all.owed) - toCents(s.all.bills) - toCents(s.all.invoices)
    )
    if (m < today) {
      rows[m] = { month: m, past: true, summary: s, opening: 0, closing: result, result }
      continue
    }
    const opening = carry
    const closing = fromCents(toCents(opening) + toCents(result))
    rows[m] = { month: m, past: false, summary: s, opening, closing }
    carry = closing
  }
  return rows
}

/** Every month that has something in it — used to size the month strip. */
export function dataMonths(data) {
  const set = new Set()
  for (const i of data.items) {
    set.add(i.month)
    if (i.endMonth) set.add(i.endMonth)
  }
  for (const p of data.purchases) {
    set.add(p.invoiceMonth)
    set.add(lastPurchaseMonth(p))
  }
  for (const c of data.cards) Object.keys(c.invoices || {}).forEach(k => set.add(k))
  return [...set].filter(Boolean).sort()
}

export function knownPeople(data) {
  const names = new Set()
  data.items.forEach(i => i.person && names.add(i.person))
  data.purchases.forEach(p => p.person && names.add(p.person))
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function knownDescriptions(data, kind) {
  const counts = new Map()
  const source = kind === 'purchase' ? data.purchases : data.items.filter(i => i.kind === kind)
  for (const r of source) {
    const d = r.description?.trim()
    if (d) counts.set(d, (counts.get(d) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d).slice(0, 30)
}
