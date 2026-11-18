#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sources = JSON.parse(await readFile(new URL('./sources.json', import.meta.url)))
const root = process.env.WASM_WORK_DIR
  ? join(process.env.WASM_WORK_DIR, 'src')
  : fileURLToPath(new URL('../work/src/', import.meta.url))
await mkdir(root, { recursive: true })
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

// A source may list several URLs, the project's own first: they are tried in order until one
// serves the pinned bytes.
// Some hosts answer automated downloads (CI runners, for one) with a challenge page instead.
async function download(name, urls, hash) {
  const failures = []
  for (const url of urls) {
    console.log(`Downloading ${url}`)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(180_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (sha256(bytes) === hash) return bytes
      throw new Error(
        `SHA-256 mismatch (${bytes.length} bytes, ${response.headers.get('content-type')})`,
      )
    } catch (error) {
      failures.push(`${url}: ${error.message}`)
    }
  }
  throw new Error(`could not download ${name}:\n  ${failures.join('\n  ')}`)
}

for (const [name, url, hash] of sources) {
  const path = join(root, name)
  let bytes
  try {
    bytes = await readFile(path)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    bytes = await download(name, Array.isArray(url) ? url : [url], hash)
  }
  if (sha256(bytes) !== hash) throw new Error(`SHA-256 mismatch: ${name}`)
  await writeFile(`${path}.verified`, bytes)
  await rename(`${path}.verified`, path)
  const dir = name.replace(/\.tar\.(gz|xz)$/, '')
  try {
    await access(join(root, dir))
  } catch {
    execFileSync('tar', ['-xf', path, '-C', root], { stdio: 'inherit' })
  }
  console.log(`Verified ${name}`)
}
