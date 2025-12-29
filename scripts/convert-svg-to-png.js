/**
 * Script to convert SVG icons to PNG for email templates
 * Run with: node scripts/convert-svg-to-png.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/emails/icons');

// Icon sizes
const iconSizes = {
  'check-green': 32,
  'hourglass-orange': 32,
  'x-red': 32,
  'x-gray': 32,
  'bell-blue': 32,
  'star-purple': 32,
  'calendar-gray': 18,
  'clock-gray': 18,
  'users-gray': 18,
  'message-circle-gray': 18,
  'settings-gray': 18,
  'info-gray': 18,
};

async function convertSvgToPng() {
  console.log('Converting SVG icons to PNG...\n');

  for (const [name, size] of Object.entries(iconSizes)) {
    const svgPath = path.join(ICONS_DIR, `${name}.svg`);
    const pngPath = path.join(ICONS_DIR, `${name}.png`);

    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  Skipping ${name}.svg (not found)`);
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      
      console.log(`✅ ${name}.png (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error converting ${name}.svg:`, error.message);
    }
  }

  console.log('\n✅ PNG conversion complete!');
}

convertSvgToPng().catch(console.error);
