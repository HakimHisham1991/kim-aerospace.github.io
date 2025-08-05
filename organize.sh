#!/bin/bash

# Create folders
mkdir -p tools/milling/{mill-ball-dia,mill-bull-dia,mill-ct,mill-fz,mill-param,mill-vc}
mkdir -p tools/turning/{turn-ct,turn-f,turn-param,turn-ra,turn-vc}
mkdir -p tools/excel-join
mkdir -p assets/images
mkdir -p assets/styles

# Milling tools
mv mill-ball-dia.* tools/milling/mill-ball-dia/
mv mill-bull-dia.* tools/milling/mill-bull-dia/
mv mill-ct.* tools/milling/mill-ct/
mv mill-fz.* tools/milling/mill-fz/
mv mill-param.* tools/milling/mill-param/
mv mill-vc.* tools/milling/mill-vc/

# Turning tools
mv turn-ct.* tools/turning/turn-ct/
mv turn-f.* tools/turning/turn-f/
mv turn-param.* tools/turning/turn-param/
mv turn-ra.* tools/turning/turn-ra/
mv turn-vc.* tools/turning/turn-vc/

# Excel joiner
mv excel-join.* tools/excel-join/

# Shared styles/images
mv *.jpg assets/images/ 2>/dev/null
mv *.gif assets/images/ 2>/dev/null
mv styles.css assets/styles/ 2>/dev/null
