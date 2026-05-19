const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgLogo = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="120" fill="#2563EB"/>
  <!-- Centered Lightning Bolt (Zap) -->
  <path d="M280 48L120 288h120v176l160-240H280z" fill="#FFFFFF"/>
</svg>
`;

const destPng = path.join(__dirname, '..', 'assets', 'icon.png');

(async () => {
  try {
    await sharp(Buffer.from(svgLogo))
      .resize(512, 512)
      .png()
      .toFile(destPng);
    console.log(`✓ Successfully rendered ViraLoop logo to \${destPng}`);
  } catch (err) {
    console.error('Error rendering SVG:', err);
  }
})();
