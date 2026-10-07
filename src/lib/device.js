/** Copies text, falling back to execCommand where the Clipboard API is blocked (plain http). */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    ta.remove()
    return ok
  }
}

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches

/** Opens the system share sheet. Returns 'shared' | 'cancelled' | 'unsupported'. */
export async function share(data) {
  if (!navigator.share || (navigator.canShare && !navigator.canShare(data))) return 'unsupported'
  try {
    await navigator.share(data)
    return 'shared'
  } catch (e) {
    return e?.name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}

export function download(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
