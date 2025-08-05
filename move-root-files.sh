#!/bin/bash

echo "🔄 Moving root HTML/CSS/JS files into tools subfolders..."

# Define machining type prefixes and their target folders
declare -A MACHINING_TYPE
MACHINING_TYPE=( ["mill"]="tools/milling" ["turn"]="tools/turning" )

# Loop over matching files in root
for file in *.html *.css *.js; do
    # Extract the base name (e.g., "mill-ct" from "mill-ct.html")
    base=$(echo "$file" | sed -E 's/\.(html|css|js)$//')

    # Extract machining type (prefix before first dash)
    prefix=${base%%-*}

    # Check if this prefix is mapped
    target_dir="${MACHINING_TYPE[$prefix]}/$base"

    if [ -d "$target_dir" ]; then
        echo "📁 Moving $file ➜ $target_dir/"
        mv "$file" "$target_dir/"
    else
        echo "⚠️  No target folder for $file — skipped"
    fi
done

echo "✅ Done moving files."
