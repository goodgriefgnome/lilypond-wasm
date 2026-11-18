#!/usr/bin/env bun
// Point the package at a release of the engine now in dist/: record the release (its
// repository, its tag and the LilyPond version inside it) and each file's hash and size in
// src/dist-files.mjs, which fetch-dist downloads from and the demo shows, and set the version
// in package.json to the tag without a leading "v".
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

const sources = JSON.parse(readFileSync(join(root, 'build/sources.json'), 'utf8'))
const lilypond = sources
  .map(([archive]) => /^lilypond-(\d+\.\d+\.\d+)\.tar/.exec(archive)?.[1])
  .find(Boolean)
if (!lilypond) throw new Error('no lilypond archive in build/sources.json')

const pins = ['lilypond.mjs', 'lilypond.wasm', 'runtime.data.bin'].map((name) => {
  const bytes = readFileSync(join(root, 'dist', name))
  return [name, createHash('sha256').update(bytes).digest('hex'), bytes.length]
})
writeFileSync(
  join(root, 'src/dist-files.mjs'),
  `/** The release the files in dist/ come from. Written by build/pin-dist.mjs. */
export const DIST_RELEASE = {
  owner: '${owner}',
  repo: 'lilypond-wasm',
  tag: '${tag}',
  lilypond: '${lilypond}',
}

/** The files in dist/: [sha256, size in bytes]. */
export const DIST_FILES = {
${pins.map(([name, hash, size]) => `  '${name}': [\n    '${hash}',\n    ${size},\n  ],`).join('\n')}
}
`,
)

const packagePath = join(root, 'package.json')
const pkg = readFileSync(packagePath, 'utf8')
const version = tag.replace(/^v/, '')
if (!/"version": "[^"]*"/.test(pkg)) throw new Error('version not found in package.json')
writeFileSync(packagePath, pkg.replace(/"version": "[^"]*"/, `"version": "${version}"`))
console.log(
  `Pinned ${owner}/lilypond-wasm ${tag} (LilyPond ${lilypond}): ` +
    pins.map(([name, , size]) => `${name} (${size} bytes)`).join(', '),
)
