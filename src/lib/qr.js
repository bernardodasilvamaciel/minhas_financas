import qrcode from 'qrcode-generator'

/** Returns { size, path } — an SVG path of the dark modules, without quiet zone. */
export function qrPath(text) {
  const qr = qrcode(0, 'L')
  qr.addData(text, 'Byte')
  qr.make()
  const size = qr.getModuleCount()
  let path = ''
  for (let y = 0; y < size; y++) {
    let x = 0
    while (x < size) {
      if (!qr.isDark(y, x)) { x++; continue }
      const start = x
      while (x < size && qr.isDark(y, x)) x++
      path += `M${start} ${y}h${x - start}v1h${start - x}z`
    }
  }
  return { size, path }
}
