#!/bin/sh
set -eu
mkdir -p publish
for file in index.html play-v48.html index.js game-v48.pck index.png index.icon.png index.apple-touch-icon.png index.audio.worklet.js index.audio.position.worklet.js; do
  cp "$file" publish/
done
cat index.wasm.part1 index.wasm.part2 > publish/index.wasm
printf '%s  %s\n' '11ea19645368f8e73cf337b59cfd7ceeb4ebb51f7a3bbf77d1a5c3ddfedbc522' 'publish/index.wasm' | sha256sum -c -
