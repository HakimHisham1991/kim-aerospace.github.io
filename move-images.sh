#!/bin/bash

ROOT_DIR="$(pwd)"
IMAGE_DIR="$ROOT_DIR/assets/images"

echo "📂 Looking for images in $IMAGE_DIR"
cd "$IMAGE_DIR" || { echo "❌ $IMAGE_DIR not found. Exiting."; exit 1; }

for file in *.{jpg,gif,png}; do
  [ -e "$file" ] || continue

  base="${file%-*}"  # remove suffix like -1
  moved=false

  for path in "$ROOT_DIR/tools/milling/$base" "$ROOT_DIR/tools/turning/$base"; do
    if [ -d "$path" ]; then
      echo "✅ Moving $file → $path"
      mv "$file" "$path/"
      moved=true
      break
    fi
  done

  if [ "$moved" = false ]; then
    echo "⚠️  No folder found for $base — Skipped $file"
  fi
done
