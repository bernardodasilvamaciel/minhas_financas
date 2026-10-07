import { normalize } from './storage'

// A transfer code is the whole data set, deflated and base64url-encoded:
//   MF1.<base64url(deflate-raw(json))>   — compressed
//   MF0.<base64url(json)>                — fallback for browsers without CompressionStream
// The same code travels inside links (#importar=CODE), QR codes and plain text.

const HASH_PREFIX = '#importar='

function toB64url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}

export async function encodeData(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  if (typeof CompressionStream !== 'undefined') {
    return 'MF1.' + toB64url(await pipe(bytes, new CompressionStream('deflate-raw')))
  }
  return 'MF0.' + toB64url(bytes)
}

/** Pulls a code out of whatever the person pasted: the code itself, a link, or text around it. */
export function extractCode(text) {
  const m = String(text || '').match(/MF[01]\.[A-Za-z0-9_-]+/)
  return m ? m[0] : null
}

export async function decodeCode(code) {
  const version = code.slice(0, 4)
  const bytes = fromB64url(code.slice(4))
  let json
  if (version === 'MF1.') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador é antigo demais para ler o código. Use o arquivo de backup.')
    json = new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')))
  } else if (version === 'MF0.') {
    json = new TextDecoder().decode(bytes)
  } else {
    throw new Error('Código não reconhecido.')
  }
  return normalize(JSON.parse(json))
}

export function appUrl() {
  return location.origin + location.pathname
}

export const linkFor = code => appUrl() + HASH_PREFIX + code

export function codeFromHash(hash = location.hash) {
  return hash.startsWith(HASH_PREFIX) ? extractCode(hash) : null
}

export const isLocalhost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)

// ── Multi-part QR ──────────────────────────────────────────────────────────
// Big data sets don't fit one scannable QR, so the code is cut into frames
// that rotate on screen:  MFP.<set>.<index>.<total>.<chunk>

export const QR_SINGLE_LIMIT = 900
const QR_CHUNK = 600

export function qrFrames(code) {
  const link = linkFor(code)
  if (link.length <= QR_SINGLE_LIMIT) return [link]
  const set = Math.random().toString(36).slice(2, 6)
  const total = Math.ceil(code.length / QR_CHUNK)
  return Array.from({ length: total }, (_, i) =>
    `MFP.${set}.${i + 1}.${total}.${code.slice(i * QR_CHUNK, (i + 1) * QR_CHUNK)}`)
}

/** Accumulates scanned frames; returns the full code once every part is in. */
export function createFrameCollector() {
  let set = null
  let parts = []
  return {
    get received() { return parts.filter(Boolean).length },
    get total() { return parts.length },
    get parts() { return parts },
    push(text) {
      const single = extractCode(text)
      if (single && !text.startsWith('MFP.')) return { done: true, code: single }
      const m = String(text).match(/^MFP\.([a-z0-9]+)\.(\d+)\.(\d+)\.(.+)$/)
      if (!m) return { done: false, unknown: true }
      const [, s, i, n, chunk] = m
      if (s !== set) { set = s; parts = Array(Number(n)).fill(null) }
      parts[Number(i) - 1] = chunk
      if (parts.every(Boolean)) return { done: true, code: parts.join('') }
      return { done: false }
    },
  }
}

// ── Merge ──────────────────────────────────────────────────────────────────
// Last write wins per record (by updatedAt). Deletions win when they're newer
// than the record, so a thing removed on one device stays removed.

function mergeList(a, b, deleted) {
  const map = new Map(a.map(r => [r.id, r]))
  for (const r of b) {
    const mine = map.get(r.id)
    if (!mine || (r.updatedAt || 0) > (mine.updatedAt || 0)) map.set(r.id, r)
  }
  return [...map.values()].filter(r => !(deleted[r.id] && deleted[r.id] >= (r.updatedAt || 0)))
}

export function mergeData(local, incoming) {
  const deleted = { ...local.deleted }
  for (const [id, ts] of Object.entries(incoming.deleted || {})) deleted[id] = Math.max(deleted[id] || 0, ts)
  const pickBalance = () => {
    const a = local.balance, b = incoming.balance
    if (!a) return b
    if (!b) return a
    return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a
  }
  return {
    v: 1,
    balance: pickBalance(),
    cards: mergeList(local.cards, incoming.cards, deleted),
    purchases: mergeList(local.purchases, incoming.purchases, deleted),
    items: mergeList(local.items, incoming.items, deleted),
    deleted,
  }
}

export function describeData(d) {
  return {
    cards: d.cards.length,
    purchases: d.purchases.length,
    items: d.items.length,
    balance: d.balance?.amount ?? null,
  }
}
