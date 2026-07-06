// patch-vite.js — applies fix for Vite 8 + Rolldown + Windows junction path bug
// Run automatically via postinstall / postbuild
// BUG: When project path has Chinese chars (D:\代码\...) accessed via junction (D:\oma),
// vite:build-html generates fileName = "..\代码\one-man-army-office\index.html" (relative path),
// which Rolldown rejects ("must be string, neither absolute nor relative").
// FIX: sanitize fileName before emitFile to remove leading ../ and Chinese chars.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const nodePath = join(__dirname, 'node_modules', 'vite', 'dist', 'node', 'chunks', 'node.js')
const code = readFileSync(nodePath, 'utf8')

const oldCode = `\t\t\t\tconst shortEmitName = normalizePath(path.relative(config.root, normalizedId));
\t\t\t\tthis.emitFile({
\t\t\t\t\ttype: "asset",
\t\t\t\t\toriginalFileName: normalizedId,
\t\t\t\t\tfileName: shortEmitName,
\t\t\t\t\tsource: result
\t\t\t\t});`

const newCode = `\t\t\t\tlet shortEmitName = normalizePath(path.relative(config.root, normalizedId));
\t\t\t\t// Vite 8 + Rolldown + Windows junction: sanitize paths with Chinese chars or leading ..\
\t\t\t\tif (/[\\u4e00-\\u9fa5]/.test(shortEmitName) || shortEmitName.startsWith('..')) {
\t\t\t\t\t// Strip leading ../  e.g. "../代码/one-man-army-office/index.html"
\t\t\t\t\t// Then replace each Chinese char with single underscore e.g. "代码"→"__"
\t\t\t\t\tlet s = shortEmitName.replace(/^\\.\\.\\//, '').replace(/[\\u4e00-\\u9fa5]/g, '_').replace(/\\\\/g, '/')
\t\t\t\t\tif (!s || s === '') s = 'index.html'
\t\t\t\t\tshortEmitName = s
\t\t\t\t}
\t\t\t\tthis.emitFile({
\t\t\t\t\ttype: "asset",
\t\t\t\t\toriginalFileName: normalizedId,
\t\t\t\t\tfileName: shortEmitName,
\t\t\t\t\tsource: result
\t\t\t\t});`

if (!code.includes('Vite 8 + Rolldown + Windows junction')) {
  if (code.includes(oldCode)) {
    writeFileSync(nodePath, code.replace(oldCode, newCode))
    console.log('[patch-vite] Patched successfully:', nodePath)
  } else {
    console.warn('[patch-vite] WARNING: target pattern not found, file may already be patched or Vite version changed')
    console.warn('[patch-vite] Searching for similar patterns...')
    const idx = code.indexOf('const shortEmitName = normalizePath(path.relative(config.root, normalizedId))')
    if (idx !== -1) {
      console.warn('[patch-vite] Found similar at index', idx, ':', code.slice(idx, idx + 200))
    }
  }
} else {
  console.log('[patch-vite] Already patched, skipping.')
}
