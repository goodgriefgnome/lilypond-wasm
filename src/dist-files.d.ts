/** The release the files in dist/ come from. */
export const DIST_RELEASE: Readonly<{ owner: string; repo: string; tag: string; lilypond: string }>
export const DIST_FILES: Readonly<Record<string, readonly [sha256: string, size: number]>>
