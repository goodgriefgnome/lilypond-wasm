#!/usr/bin/env bun
// Assemble docs/ into a servable site: the page, the package source it imports, and the engine.
// dist/ is not in the repo, so this is also the reason GitHub Pages cannot just serve docs/.
//
//   bun run demo    # assemble and serve at http://localhost:8000
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertDist } from './fetch-dist.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = join(root, '_site')

// The engine before the stack-depth fixes, served at legacy/ so stack-test.html can compare the
// two in the same browser. The package source is unchanged since then, so legacy/src is a copy
// of src/; only the engine files differ.
const LEGACY = {
  url: 'https://github.com/sightread/lilypond-wasm/releases/download/v0.1.1',
  files: {
    'lilypond.mjs': '3fe115d72d1a3b3e345c457e46356646ef131f9adbfeec1d007da05294ec5388',
    'lilypond.wasm': 'f267b45340454f472ee6c8a6b0e1b27ee53ce75b8326c0bda6c7ff3e55965137',
    'runtime.data.bin': '2c823124d890f51b3bff3a617d609aa31c71ce26341cc18558fd10c91dd81117',
  },
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
async function legacyDist() {
  const cache = join(root, '.cache', 'legacy-dist')
  mkdirSync(cache, { recursive: true })
  for (const [name, hash] of Object.entries(LEGACY.files)) {
    const path = join(cache, name)
    if (existsSync(path) && sha256(readFileSync(path)) === hash) continue
    const response = await fetch(`${LEGACY.url}/${name}`)
    if (!response.ok) throw new Error(`legacy ${name}: HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (sha256(bytes) !== hash) throw new Error(`legacy ${name}: checksum mismatch`)
    writeFileSync(path, bytes)
  }
  return cache
}

await assertDist()
rmSync(site, { recursive: true, force: true })
mkdirSync(site, { recursive: true })
cpSync(join(root, 'docs'), site, { recursive: true })
for (const dir of ['src', 'dist']) cpSync(join(root, dir), join(site, dir), { recursive: true })
cpSync(join(root, 'src'), join(site, 'legacy', 'src'), { recursive: true })
cpSync(await legacyDist(), join(site, 'legacy', 'dist'), { recursive: true })
console.log(`Assembled ${site}`)

if (process.argv.includes('--serve')) {
  const server = Bun.serve({
    port: 8000,
    fetch(request) {
      const path = new URL(request.url).pathname
      const file = Bun.file(join(site, path === '/' ? 'index.html' : path))
      return new Response(file)
    },
  })
  console.log(`Serving on http://localhost:${server.port}`)
}
