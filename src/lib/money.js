const plainFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const toCents = v => Math.round((Number(v) || 0) * 100)
export const fromCents = c => c / 100

/** Sum amounts without floating-point drift. */
export const sum = (list, pick = x => x) => fromCents(list.reduce((a, x) => a + toCents(pick(x)), 0))

/** '1.234,56' — no currency sign, for columns where R$ is implied. */
export const plain = v => plainFmt.format(Math.abs(v || 0))

/** 'R$ 1.234,56' / '−R$ 1.234,56' */
export const brl = v => `${v < 0 ? '−' : ''}R$ ${plain(v)}`

/** Splits a value for big displays: { sign, int: '1.234', dec: '56' }. */
export function splitMoney(v) {
  const [int, dec] = plain(v).split(',')
  return { sign: v < 0 ? '−' : '', int, dec }
}
