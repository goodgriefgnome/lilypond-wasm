# Building 

Most of the time you don't need this — `bun run fetch-dist` downloads the pinned build. This is
for iterating on the wasm build, not using it.

You need Emscripten on `PATH`, plus meson, ninja, cmake, autoconf, pkg-config, python3, bison,
flex, guile 3.0.11 and lilypond 2.26.0. On a Mac:

```sh
brew install emscripten meson ninja cmake autoconf pkg-config bison flex guile lilypond
```

On Linux, `FlexLexer.h` usually sits in `/usr/include`, and putting that on the WebAssembly
include path pulls in the host's C library headers. Copy the header into a directory of its own
and point `FLEX_INCLUDE` at it. If LilyPond's data directory can't be found by running `lilypond`,
set `LILYPOND_DATADIR_NATIVE` to its `share/lilypond/2.26.0` folder.

Then:

```sh
bun run fetch-sources     # downloads and hash-checks everything in build/sources.json
./build/build.sh          # ~40 minutes on my M1 MBP; writes dist/
```

`build.sh <step>` runs one step — see the `case` at the bottom for the names. Everything
intermediate lands in `work/`, which is scratch: delete it to start over.

The last two steps (`data`, `notices`) copy LilyPond's data directory and regenerate
`licenses/`. 

# Releasing

Run the **Release** workflow from the Actions tab with the new version (e.g. `0.4.0`). It builds
everything from source on Linux, using LilyPond's official Linux release for the data directory,
then runs the tests. It publishes `dist/lilypond.mjs`, `dist/lilypond.wasm` and
`dist/runtime.data.bin` as a release, commits the result of `bun build/pin-dist.mjs` to `main`,
and redeploys Pages. The C libraries, Guile and Emscripten are cached, so only the first run, or
one after `build/` changes, does the full build.

To release by hand, attach those three files to a GitHub release, then run
`bun build/pin-dist.mjs <owner> <tag>` to update `build/fetch-dist.mjs`, `src/dist-files.mjs` and
`package.json` to match.
