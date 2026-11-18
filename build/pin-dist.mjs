#!/usr/bin/env bun
// Point the package at a release of the engine now in dist/: record each file's hash and size
// in src/dist-files.mjs, the release's owner and tag in build/fetch-dist.mjs, and the version
// (the tag without a leading "v") in package.json.
//
//   bun build/pin-dist.mjs <owner> <tag>
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [owner, tag] = process.argv.slice(2)
if (!owner || !/^[A-Za-z0-9-]+$/.test(owner) || !tag || !/^v?\d+\.\d+\.\d+$/.test(tag))
  throw new Error('Usage: bun build/pin-dist.mjs <owner> <tag like 0.4.0 or v0.4.0>')

const pins = ['lilypond.mjs', 'lilypond.wasm', 'runtime.data.bin'].map((name) => {
  const bytes = readFileSync(join(root, 'dist', name))
  return [name, createHash('sha256').update(bytes).digest('hex'), bytes.length]
})
writeFileSync(
  join(root, 'src/dist-files.mjs'),
  `/** The files in dist/: [sha256, size in bytes]. */
export const DIST_FILES = {
${pins.map(([name, hash, size]) => `  '${name}': [\n    '${hash}',\n    ${size},\n  ],`).join('\n')}
}
`,
)

const fetchDist = join(root, 'build/fetch-dist.mjs')
let source = readFileSync(fetchDist, 'utf8')
for (const [name, value] of [['OWNER', owner], ['RELEASE', tag]]) {
  const pattern = new RegExp(`^export const ${name} = '[^']*'$`, 'm')
  if (!pattern.test(source)) throw new Error(`${name} not found in build/fetch-dist.mjs`)
  source = source.replace(pattern, `export const ${name} = '${value}'`)
}
writeFileSync(fetchDist, source)

const packagePath = join(root, 'package.json')
const pkg = readFileSync(packagePath, 'utf8')
const version = tag.replace(/^v/, '')
if (!/"version": "[^"]*"/.test(pkg)) throw new Error('version not found in package.json')
writeFileSync(packagePath, pkg.replace(/"version": "[^"]*"/, `"version": "${version}"`))
console.log(`Pinned ${owner}/${tag}: ${pins.map(([n, , s]) => `${n} (${s} bytes)`).join(', ')}`)
