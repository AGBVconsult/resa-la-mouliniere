import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG content for the icon
const createSvg = (size, padding = 0) => {
  const innerSize = size - padding * 2;
  const fontSize = Math.round(innerSize * 0.47);
  const textY = Math.round(size / 2 + fontSize * 0.35);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${Math.round(innerSize * 0.125)}" fill="#0f172a"/>
  <text x="${size / 2}" y="${textY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle">LM</text>
</svg>`;
};

// Maskable icons need safe zone padding (10% on each side = 20% total)
const createMaskableSvg = (size) => {
  const padding = Math.round(size * 0.1);
  return createSvg(size, padding);
};

async function generateIcons() {
  const sizes = [192, 512];
  
  for (const size of sizes) {
    // Regular icon
    const svg = createSvg(size);
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    writeFileSync(join(publicDir, `admin-icon-${size}.png`), pngBuffer);
    console.log(`Created admin-icon-${size}.png`);
    
    // Maskable icon (with safe zone padding)
    const maskableSvg = createMaskableSvg(size);
    const maskablePngBuffer = await sharp(Buffer.from(maskableSvg))
      .png()
      .toBuffer();
    writeFileSync(join(publicDir, `admin-icon-maskable-${size}.png`), maskablePngBuffer);
    console.log(`Created admin-icon-maskable-${size}.png`);
  }
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
