#!/bin/bash

echo "📦 Preparing to move NC-related files into tools/nc_program/..."

# Create base destination folder if it doesn't exist
mkdir -p tools/nc_program

# List of filenames to skip (exact matches)
SKIP=("index.html" "styles.css" "nc-sim.html" "nc-sim.css" "nc-sim.js")

# Skip js folder files
for file in analyzer-* converter* excel-join* mazatrol-viewer* nc-*; do
    # Skip if file not found
    [ -e "$file" ] || continue

    # Skip files in js folder
    if [[ "$file" == js/* ]]; then
        echo "⏩ Skipping $file (inside js/)"
        continue
    fi

    # Skip explicitly listed files
    for skip in "${SKIP[@]}"; do
        if [[ "$file" == "$skip" ]]; then
            echo "⏩ Skipping $file"
            continue 2
        fi
    done

    # Get filename core (e.g., analyzer-eia.css → analyzer-eia)
    base="${file%%.*}"

    # Create destination subfolder
    dest="tools/nc_program/$base"
    mkdir -p "$dest"

    # Move all files with the same base name
    mv "$base".* "$dest/" 2>/dev/null

    echo "✅ Moved $base.* → $dest/"
done

echo "🎉 All done!"
