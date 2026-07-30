const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const rootDir = path.resolve(__dirname, '..');
const bgPath = path.join(rootDir, 'assets/images/android-icon-background.png');
const splashPath = path.join(rootDir, 'assets/images/splash-icon.png');

console.log('Reading background:', bgPath);
const bgBuf = fs.readFileSync(bgPath);
const bgPng = PNG.sync.read(bgBuf);

console.log(`Background dimensions: ${bgPng.width}x${bgPng.height}`);

console.log('Reading splash icon:', splashPath);
const splashBuf = fs.readFileSync(splashPath);
const splashPng = PNG.sync.read(splashBuf);

console.log(`Splash icon dimensions: ${splashPng.width}x${splashPng.height}`);

// Target size for splash icon inside 1024x1024 background (e.g. 620x620)
const targetWidth = 620;
const targetHeight = Math.round((splashPng.height / splashPng.width) * targetWidth);

// Create scaled splash PNG using bilinear sampling
const scaledSplash = new PNG({ width: targetWidth, height: targetHeight });

for (let y = 0; y < targetHeight; y++) {
  for (let x = 0; x < targetWidth; x++) {
    const srcX = (x / targetWidth) * splashPng.width;
    const srcY = (y / targetHeight) * splashPng.height;

    const x1 = Math.floor(srcX);
    const y1 = Math.floor(srcY);
    const x2 = Math.min(x1 + 1, splashPng.width - 1);
    const y2 = Math.min(y1 + 1, splashPng.height - 1);

    const dx = srcX - x1;
    const dy = srcY - y1;

    const idx11 = (y1 * splashPng.width + x1) * 4;
    const idx21 = (y1 * splashPng.width + x2) * 4;
    const idx12 = (y2 * splashPng.width + x1) * 4;
    const idx22 = (y2 * splashPng.width + x2) * 4;

    const destIdx = (y * targetWidth + x) * 4;

    for (let c = 0; c < 4; c++) {
      const val = (1 - dx) * (1 - dy) * splashPng.data[idx11 + c] +
                  dx * (1 - dy) * splashPng.data[idx21 + c] +
                  (1 - dx) * dy * splashPng.data[idx12 + c] +
                  dx * dy * splashPng.data[idx22 + c];
      scaledSplash.data[destIdx + c] = Math.round(val);
    }
  }
}

// Composite scaledSplash onto bgPng centered
const startX = Math.round((bgPng.width - targetWidth) / 2);
const startY = Math.round((bgPng.height - targetHeight) / 2);

for (let y = 0; y < targetHeight; y++) {
  for (let x = 0; x < targetWidth; x++) {
    const bgX = startX + x;
    const bgY = startY + y;

    if (bgX < 0 || bgX >= bgPng.width || bgY < 0 || bgY >= bgPng.height) continue;

    const splashIdx = (y * targetWidth + x) * 4;
    const bgIdx = (bgY * bgPng.width + bgX) * 4;

    const alpha = scaledSplash.data[splashIdx + 3] / 255;
    if (alpha <= 0) continue;

    for (let c = 0; c < 3; c++) {
      const fgCol = scaledSplash.data[splashIdx + c];
      const bgCol = bgPng.data[bgIdx + c];
      bgPng.data[bgIdx + c] = Math.round(fgCol * alpha + bgCol * (1 - alpha));
    }
    bgPng.data[bgIdx + 3] = 255; // fully opaque
  }
}

// Output final composite PNG
const compositeBuffer = PNG.sync.write(bgPng);

// Write to master logo files
const masterLogoPath = path.join(rootDir, 'assets/images/app-logo.png');
const iconPath = path.join(rootDir, 'assets/images/icon.png');
const androidFgPath = path.join(rootDir, 'assets/images/android-icon-foreground.png');

fs.writeFileSync(masterLogoPath, compositeBuffer);
fs.writeFileSync(iconPath, compositeBuffer);
fs.writeFileSync(androidFgPath, compositeBuffer);

console.log('✅ Composite master app-logo.png successfully created!');
