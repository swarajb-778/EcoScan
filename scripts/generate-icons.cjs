#!/usr/bin/env node
/**
 * PWA Icon Generator for EcoScan
 * Generates PNG icons using HTML5 Canvas for PWA manifest
 */

const fs = require('fs');
const path = require('path');

// Check if we're in a browser-like environment (this won't work in Node.js directly)
// We'll create a simple solution using canvas if available, or create basic icons

function createBasicIcon(size, color, filename) {
  // Create a simple SVG that we can convert manually
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white" opacity="0.9"/>
  <text x="${size/2}" y="${size/2 + 8}" text-anchor="middle" fill="${color}" font-family="Arial, sans-serif" font-size="${size/8}" font-weight="bold">ECO</text>
</svg>`;
  
  return svg;
}

function main() {
  console.log('🎨 EcoScan PWA Icon Generator (Simple Version)');
  console.log('=' .repeat(50));
  
  const staticDir = path.join(__dirname, '..', 'static');
  
  if (!fs.existsSync(staticDir)) {
    console.error('❌ Static directory not found');
    process.exit(1);
  }
  
  // Icon configurations
  const icons = [
    { size: 192, filename: 'icon-192.png', color: '#22c55e', maskable: false },
    { size: 512, filename: 'icon-512.png', color: '#22c55e', maskable: false },
    { size: 192, filename: 'icon-maskable-192.png', color: '#22c55e', maskable: true },
    { size: 512, filename: 'icon-maskable-512.png', color: '#22c55e', maskable: true },
  ];
  
  console.log('📝 Creating temporary SVG icons...');
  
  let successCount = 0;
  
  icons.forEach(iconConfig => {
    try {
      const svg = createBasicIcon(
        iconConfig.size, 
        iconConfig.color, 
        iconConfig.filename
      );
      
      // Save as SVG temporarily (we'll convert to PNG manually or use online tools)
      const svgFilename = iconConfig.filename.replace('.png', '.svg');
      const svgPath = path.join(staticDir, svgFilename);
      fs.writeFileSync(svgPath, svg);
      
      console.log(`✅ Created ${svgFilename} (${iconConfig.size}x${iconConfig.size})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create ${iconConfig.filename}:`, error.message);
    }
  });
  
  console.log();
  console.log(`📊 Generation complete: ${successCount}/${icons.length} SVG templates created`);
  console.log();
  console.log('🔧 Next steps:');
  console.log('1. Convert SVG files to PNG using an online converter');
  console.log('2. Or install ImageMagick: brew install imagemagick');
  console.log('3. Or use the SVG files directly in manifest.json');
  console.log();
  console.log('📁 Files created in static/ directory:');
  icons.forEach(icon => {
    const svgName = icon.filename.replace('.png', '.svg');
    console.log(`  • ${svgName}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { createBasicIcon }; 