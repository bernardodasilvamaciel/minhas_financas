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
               changes: { [month]: amount },   — new value from that month on (recurring only)
               overrides: { [month]: amount }, — value for that month only
               skips: [month], done: { [month]: true }, updatedAt }
  deleted:   { [id]: timestamp }                     — tombstones, so merging two devices doesn't resurrect deletions

  Rule of thumb for the projection: anything marked as paid/received is assumed to be
  already reflected in "Tenho agora", so it is never counted again.
*/

export const KINDS = {
  purchase:   { label: 'Compra no cartão', short: 'Cartão' },
  bill:       { label: 'Conta a pagar', short: 'Conta' },
  income:     { label: 'Entrada', short: 'Entrada' },
  receivable: { label: 'Alguém me deve', short: 'Me devem' },
}

export const CARD_COLORS = ['#6D3FD1', '#E2552F', '#1F7A5A', '#1F4FD1', '#C2185B', '#2B2F36', '#D49A00', '#00838F']

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

export function itemAmount(item, m) {
  if (item.overrides && m in item.overrides) return item.overrides[m]
  let amount = item.amount
  if (item.changes) {
    let best = ''
    for (const k of Object.keys(item.changes)) if (k <= m && k > best) best = k
    if (best) amount = item.changes[best]
  }
  return amount
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
    const row = { type: 'item', item, amount: itemAmount(item, m), done: !!item.done?.[m] }
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

  const pending = list => sum(list.filter(r => !r.done), r => r.amount)
  const all = list => sum(list, r => r.amount)

  return {
    month: m,
    incomes, bills, owed, invoices,
    all: {
      incomes: all(incomes), owed: all(owed), bills: all(bills),
      invoices: sum(invoices, i => i.total),
    },
    pending: {
      incomes: pending(incomes), owed: pending(owed), bills: pending(bills),
      invoices: sum(invoices.filter(i => !i.paid), i => i.total),
    },
  }
}

/**
 * Month-by-month projection.
 * Past months show their own result (in − out). From the current month on,
 * the balance carries over: opening + pending in − pending out = closing.
 */
export function projection(data, from, to, today = monthKey()) {
  const rows = {}
  let carry = data.balance?.amount || 0
  for (const m of monthRange(from < today ? from : today, to)) {
    const s = monthSummary(data, m)
    if (m < today) {
      const result = s.all.incomes + s.all.owed - s.all.bills - s.all.invoices
      rows[m] = { month: m, past: true, summary: s, opening: 0, closing: result, result }
      continue
    }
    const opening = carry
    const closing = fromCents(
      toCents(opening) + toCents(s.pending.incomes) + toCents(s.pending.owed)
      - toCents(s.pending.bills) - toCents(s.pending.invoices)
    )
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
