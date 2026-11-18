/** The release the files in dist/ come from. Written by build/pin-dist.mjs. */
export const DIST_RELEASE = {
  owner: 'goodgriefgnome',
  repo: 'lilypond-wasm',
  tag: '0.3.1',
  lilypond: '2.26.0',
}

/** The files in dist/: [sha256, size in bytes]. */
export const DIST_FILES = {
  'lilypond.mjs': [
    '6415f64d04e05d8deef1644dcfe9d4968b3b452ac4b340ebd06da31e8295a961',
    189738,
  ],
  'lilypond.wasm': [
    '66b4a630cfd536eb7e6b921f889c6b2ec7a9cdaada07260db787c8a0f2ed406d',
    15197796,
  ],
  'runtime.data.bin': [
    '513c83e0e6d8b83dfce494d37b7ef59c63d9241202df0b83b1eb93c013eb089b',
    15711138,
  ],
}
