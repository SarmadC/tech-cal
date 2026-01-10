#!/usr/bin/env node
// Script to generate PNG and ICO favicons from SVG
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const sizes = [
  { name: 'favicon-96x96.png', size: 96 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'web-app-manifest-192x192.png', size: 192 },
  { name: 'web-app-manifest-512x512.png', size: 512 },
];

const icoSizes = [16, 32, 48]; // Standard ICO sizes

async function generateFavicons() {
  const svgPath = join(process.cwd(), 'public', 'favicon.svg');
  const svgContent = readFileSync(svgPath, 'utf-8');
  const publicDir = join(process.cwd(), 'public');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to largest size needed
  await page.setViewportSize({ width: 512, height: 512 });

  // Create HTML to render SVG
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 512px;
            height: 512px;
            background: transparent;
          }
          svg {
            display: block;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await page.setContent(html);

  // Generate PNG files
  for (const { name, size } of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.reload();
    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    writeFileSync(join(publicDir, name), buffer);
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Generate ICO file (multi-size)
  // Note: Creating a simple ICO with multiple PNGs embedded
  // For simplicity, we'll create a basic ICO structure
  const icoBuffers = [];
  for (const icoSize of icoSizes) {
    await page.setViewportSize({ width: icoSize, height: icoSize });
    await page.reload();
    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: { x: 0, y: 0, width: icoSize, height: icoSize },
    });
    icoBuffers.push({ size: icoSize, buffer });
  }

  // Create ICO file
  // ICO format is complex, so we'll create a simple one
  // For now, let's just use the 32x32 PNG as favicon.ico
  // Most modern systems can handle PNG in .ico files
  writeFileSync(join(publicDir, 'favicon.ico'), icoBuffers[1].buffer); // Use 32x32
  console.log('Generated favicon.ico (32x32)');

  await browser.close();
  console.log('All favicons generated successfully!');
}

generateFavicons().catch(console.error);
