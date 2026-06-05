// Generates icon-192.png and icon-512.png for the PWA
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function encodePNG(width, height, pixels) {
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0); ihdrData.writeUInt32BE(height, 4)
  ihdrData[8]=8; ihdrData[9]=2; ihdrData[10]=0; ihdrData[11]=0; ihdrData[12]=0
  const raw = Buffer.alloc(height * (width * 3 + 1))
  for (let y = 0; y < height; y++) {
    raw[y*(width*3+1)] = 0
    for (let x = 0; x < width; x++) {
      const pi = (y*width+x)*3, ri = y*(width*3+1)+1+x*3
      raw[ri]=pixels[pi]; raw[ri+1]=pixels[pi+1]; raw[ri+2]=pixels[pi+2]
    }
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 3)

  const set = (x, y, r, g, b) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 3
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b
  }

  const fillEllipse = (cx, cy, rx, ry, r, g, b) => {
    for (let y = Math.round(cy-ry); y <= Math.round(cy+ry); y++)
      for (let x = Math.round(cx-rx); x <= Math.round(cx+rx); x++)
        if ((x-cx)**2/rx**2 + (y-cy)**2/ry**2 <= 1) set(x, y, r, g, b)
  }

  const fillRect = (x, y, w, h, r, g, b) => {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        set(Math.round(x+dx), Math.round(y+dy), r, g, b)
  }

  const fillRoundRect = (x, y, w, h, radius, r, g, b) => {
    fillRect(x+radius, y, w-radius*2, h, r, g, b)
    fillRect(x, y+radius, w, h-radius*2, r, g, b)
    fillEllipse(x+radius, y+radius, radius, radius, r, g, b)
    fillEllipse(x+w-radius, y+radius, radius, radius, r, g, b)
    fillEllipse(x+radius, y+h-radius, radius, radius, r, g, b)
    fillEllipse(x+w-radius, y+h-radius, radius, radius, r, g, b)
  }

  const s = size / 512
  // Orange rounded square background
  fillRoundRect(0, 0, size, size, Math.round(90*s), 0xC8, 0x62, 0x2A)

  // White spoon: oval bowl + tapering handle
  const cx = Math.round(size * 0.5)
  // Bowl (ellipse)
  fillEllipse(cx, Math.round(size*0.30), Math.round(size*0.165), Math.round(size*0.20), 255, 255, 255)
  // Neck connecting bowl to handle
  fillRect(cx - Math.round(size*0.038), Math.round(size*0.49), Math.round(size*0.076), Math.round(size*0.05), 255, 255, 255)
  // Handle (slightly tapered rectangle)
  for (let row = 0; row < Math.round(size*0.29); row++) {
    const taper = Math.round((row / (size*0.29)) * size * 0.012)
    const hw = Math.round(size*0.052) - taper
    fillRect(cx - hw, Math.round(size*0.535) + row, hw*2, 1, 255, 255, 255)
  }
  // Rounded handle tip
  fillEllipse(cx, Math.round(size*0.825), Math.round(size*0.034), Math.round(size*0.034), 255, 255, 255)

  return pixels
}

const outDir = path.join(__dirname, '../public/icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const pixels = generateIcon(size)
  const png = encodePNG(size, size, pixels)
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png)
  console.log(`icon-${size}.png — ${png.length} bytes`)
}
console.log('Done.')
