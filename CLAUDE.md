# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based computer vision toolkit for facial analysis and image processing, consisting of three main tools:

1. **Face Landmark Detection** (`index.html`) - Uses MediaPipe to detect facial landmarks and overlay various visualization modes (grid, eyes, guide lines)
2. **Luminance Segmentation Tool** (`lumin.html`) - Segments images by luminance values using manual thresholds or K-means clustering
3. **SLIC Superpixel Segmentation** (`slic.html`) - Implements SLIC (Simple Linear Iterative Clustering) algorithm for image superpixel segmentation

## Architecture

### Core Components

- **Face Detection**: Uses MediaPipe Face Landmarker model loaded from CDN
- **Color Space Conversion**: Custom LAB color space implementation in `lab.js` for perceptually uniform color operations
- **SLIC Algorithm**: Complete implementation in `slic.js` with superpixel clustering and edge detection
- **No Build System**: Pure HTML/JS/CSS - runs directly in browser

### Key Files

- `index.html` - Main face landmark detection interface with MediaPipe integration
- `lumin.html` - Luminance-based image segmentation tool
- `slic.html` - SLIC superpixel segmentation demo
- `slic.js` - SLIC algorithm implementation with SuperPixel class
- `lab.js` - Color space conversion utilities (RGB ↔ LAB ↔ XYZ)

## Development

### Running the Project

Since this is a static web project, serve files using:
```bash
# Simple HTTP server
python3 -m http.server 8000
# or
npx serve .
```

### Image Processing Pipeline

1. **Face Detection**: Uses MediaPipe's face_landmarker.task model for 468 facial landmarks
2. **Luminance Segmentation**: Converts RGB to LAB, segments by L* channel using manual thresholds or K-means
3. **SLIC Segmentation**: Clusters pixels in LAB+XY 5D space using iterative k-means with spatial compactness

### Key Algorithms

- **Face landmarks**: Predefined landmark indices for face vertical lines, eye horizontals, nose base, and lip base
- **SLIC**: Superpixel generation with configurable compactness and region size
- **Color space**: D65 illuminant, 2° observer for LAB conversions