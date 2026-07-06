// dist-copy.js — post-build fix for Vite 8 + Windows junction path bug
// Finds index.html anywhere in dist/ (e.g. dist/__/one-man-army-office/index.html)
// and copies it to dist/index.html so GitHub Pages serves it from the root.
import { copyFileSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, 'dist')

// 1. Find index.html anywhere in dist
const found = []
function walk(d) {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const full = join(d, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name === 'index.html') found.push(full)
  }
}
walk(dist)
console.log('[dist-copy] Found index.html at:', found)

if (found.length === 0) {
  console.error('[dist-copy] ERROR: index.html not found in dist/')
  process.exit(1)
}

const srcHtml = found[0]
const destHtml = join(dist, 'index.html')

// 2. Copy HTML to dist/index.html (relative ./assets/ paths resolve correctly)
copyFileSync(srcHtml, destHtml)
console.log(`[dist-copy] Copied → ${destHtml}`)

// 3. Also copy 404.html if found in subdirectory
const found404 = []
function walk2(d) {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const full = join(d, entry.name)
    if (entry.isDirectory()) walk2(full)
    else if (entry.name === '404.html') found404.push(full)
  }
}
walk2(dist)
const dest404 = join(dist, '404.html')
if (found404.length > 0 && found404[0] !== dest404) {
  copyFileSync(found404[0], dest404)
  console.log(`[dist-copy] Copied 404.html → ${dest404}`)
}

// 4. Remove the __/one-man-army-office/ garbage dir
const garbageDir = join(dist, '__')
if (existsSync(garbageDir)) {
  rmSync(garbageDir, { recursive: true, force: true })
  console.log('[dist-copy] Removed garbage dir:', garbageDir)
}

console.log('[dist-copy] Done!')
