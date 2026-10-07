// Month keys are 'YYYY-MM' strings, always built from local time
// (toISOString() would shift to UTC and flip the month at night).

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayISO(d = new Date()) {
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`
}

function parts(key) {
  const [y, m] = key.split('-').map(Number)
  return [y, m]
}

export function addMonths(key, n) {
  const [y, m] = parts(key)
  return monthKey(new Date(y, m - 1 + n, 1))
}

/** Number of months from a to b (b − a). */
export function diffMonths(a, b) {
  const [ya, ma] = parts(a)
  const [yb, mb] = parts(b)
  return (yb - ya) * 12 + (mb - ma)
}

export function monthRange(from, to) {
  const out = []
  for (let k = from; k <= to; k = addMonths(k, 1)) out.push(k)
  return out
}

const longFmt  = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
const shortFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

function asDate(key) {
  const [y, m] = parts(key)
  return new Date(y, m - 1, 1)
}

/** 'novembro', or 'novembro de 2027' when the year isn't the current one. */
export function monthName(key, { year = 'auto' } = {}) {
  const name = longFmt.format(asDate(key))
  const y = key.slice(0, 4)
  const showYear = year === true || (year === 'auto' && y !== String(new Date().getFullYear()))
  return showYear ? `${name} de ${y}` : name
}

/** 'nov' (no trailing dot). */
export function monthShort(key) {
  return shortFmt.format(asDate(key)).replace('.', '')
}

export function formatDay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}${y !== String(new Date().getFullYear()) ? '/' + y.slice(2) : ''}`
}
