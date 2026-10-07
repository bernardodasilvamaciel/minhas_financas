import { emptyData, uid, CARD_COLORS } from './finance'
import { monthKey } from './months'

export const DATA_KEY  = 'minhas-financas:v1'
export const PREFS_KEY = 'minhas-financas:prefs'
const LEGACY_KEYS = ['finvue_v10', 'finvue_v9', 'finvue_v8_monthly', 'finvue_v7_stable']

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0)
const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v))
const isMonth = v => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v)
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** Coerces anything that looks like v1 data into a clean, complete v1 object. */
export function normalize(raw) {
  const d = obj(raw)
  const now = Date.now()
  const out = emptyData()

  if (d.balance && typeof d.balance === 'object') {
    out.balance = { amount: num(d.balance.amount), date: str(d.balance.date), updatedAt: num(d.balance.updatedAt) || now }
  }

  out.cards = (Array.isArray(d.cards) ? d.cards : []).filter(c => c && c.id).map((c, i) => ({
    id: str(c.id),
    name: str(c.name) || 'Cartão',
    closingDay: num(c.closingDay) || null,
    dueDay: num(c.dueDay) || null,
    color: str(c.color) || CARD_COLORS[i % CARD_COLORS.length],
    invoices: Object.fromEntries(Object.entries(obj(c.invoices)).filter(([k]) => isMonth(k)).map(([k, v]) => [k, {
      total: typeof obj(v).total === 'number' ? v.total : null,
      paid: !!obj(v).paid,
    }])),
    updatedAt: num(c.updatedAt) || now,
  }))

  out.purchases = (Array.isArray(d.purchases) ? d.purchases : []).filter(p => p && p.id && isMonth(p.invoiceMonth)).map(p => ({
    id: str(p.id),
    cardId: str(p.cardId),
    description: str(p.description),
    amount: num(p.amount),
    installments: Math.max(1, Math.round(num(p.installments)) || 1),
    invoiceMonth: p.invoiceMonth,
    date: str(p.date),
    person: str(p.person),
    received: obj(p.received),
    updatedAt: num(p.updatedAt) || now,
  }))

  out.items = (Array.isArray(d.items) ? d.items : [])
    .filter(i => i && i.id && isMonth(i.month) && ['income', 'bill', 'receivable'].includes(i.kind))
    .map(i => ({
      id: str(i.id),
      kind: i.kind,
      description: str(i.description),
      person: str(i.person),
      amount: num(i.amount),
      month: i.month,
      repeat: !!i.repeat,
      endMonth: isMonth(i.endMonth) ? i.endMonth : null,
      changes: obj(i.changes),
      overrides: obj(i.overrides),
      skips: Array.isArray(i.skips) ? i.skips.filter(isMonth) : [],
      done: obj(i.done),
      updatedAt: num(i.updatedAt) || now,
    }))

  out.deleted = obj(d.deleted)
  return out
}

/** Converts the old "finvue" shape (also used by its exported .json backups). */
export function fromLegacy(d) {
  const now = Date.now()
  const out = emptyData()
  const fallbackMonth = monthKey()

  out.items.push(...(d.incomes || d.assets || []).map(a => ({
    id: a.id || uid(), kind: 'income', description: a.label || a.name || 'Entrada',
    amount: num(a.amount ?? a.value), month: isMonth(a.month) ? a.month : fallbackMonth, repeat: false, updatedAt: now,
  })))

  out.items.push(...(d.fixed || d.fixedExpenses || []).map(f => {
    const month = isMonth(f.month) ? f.month : fallbackMonth
    return {
      id: f.id || uid(), kind: 'bill', description: f.label || f.name || 'Conta',
      amount: num(f.amount ?? f.value), month, repeat: false,
      done: f.isPaid ? { [month]: true } : {}, updatedAt: now,
    }
  }))

  out.items.push(...(d.debtors || d.receivables || []).map(r => {
    const month = isMonth(r.month) ? r.month : fallbackMonth
    return {
      id: r.id || uid(), kind: 'receivable', person: r.name || '', description: r.description || r.desc || '',
      amount: num(r.amount ?? r.value), month, repeat: false,
      done: r.isPaid ? { [month]: true } : {}, updatedAt: now,
    }
  }))

  out.cards = (d.cards || []).map((c, i) => {
    const invoices = {}
    for (const [m, total] of Object.entries(c.invoiceTotal || {})) {
      if (isMonth(m)) invoices[m] = { total: typeof total === 'number' ? total : null, paid: false }
    }
    for (const [m, paid] of Object.entries(c.invoicePaid || {})) {
      if (isMonth(m)) invoices[m] = { total: invoices[m]?.total ?? null, paid: !!paid }
    }
    return { id: c.id || uid(), name: c.name || 'Cartão', closingDay: num(c.closingDay) || null, dueDay: null, color: CARD_COLORS[i % CARD_COLORS.length], invoices, updatedAt: now }
  })

  out.purchases = (d.transactions || [])
    .filter(t => t.type === undefined || t.type === 'credit')
    .map(t => {
      const date = t.date || ''
      const invoiceMonth = isMonth(date.slice(0, 7)) ? date.slice(0, 7) : fallbackMonth
      const label = t.description || t.desc || 'Compra'
      const person = t.owner && t.owner !== 'Eu' ? (t.ownerName || 'Outra pessoa') : ''
      return {
        id: t.id || uid(), cardId: t.cardId,
        description: t.installments ? `${label} (${t.installments})` : label,
        amount: num(t.amount ?? t.value), installments: 1, invoiceMonth, date, person,
        received: person && t.isPaid ? { [invoiceMonth]: true } : {}, updatedAt: now,
      }
    })

  return normalize(out)
}

export function looksLegacy(d) {
  return d && !d.v && ['incomes', 'fixed', 'debtors', 'transactions', 'assets', 'fixedExpenses'].some(k => k in d)
}

/** Parses anything we know how to read: v1 data, a v1 backup file or an old finvue export. */
export function parseAny(d) {
  if (looksLegacy(d)) return fromLegacy(d)
  return normalize(d?.data && d?.app === 'minhas-financas' ? d.data : d)
}

export function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) return { data: normalize(JSON.parse(raw)), migratedFrom: null }
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key)
      if (!legacy) continue
      const parsed = JSON.parse(legacy)
      // The old key is left untouched as a safety copy.
      return { data: fromLegacy(parsed), migratedFrom: key, legacyDark: parsed.darkMode }
    }
  } catch (e) {
    console.error('Falha ao ler dados salvos', e)
  }
  return { data: emptyData(), migratedFrom: null }
}

export function saveData(data) {
  try { localStorage.setItem(DATA_KEY, JSON.stringify(data)) } catch (e) { console.error(e) }
}

export function loadPrefs() {
  try { return obj(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')) } catch { return {} }
}

export function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* private mode */ }
}
