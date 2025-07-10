// Script to generate placeholder images
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const colors = [
  '#D2691E',
  '#4682B4',
  '#228B22',
  '#FFD700',
  '#6B46C1',
  '#EC4899',
  '#4B5563',
  '#064E3B',
  '#C2410C',
  '#1E293B',
];

const imagesDir = path.join(__dirname, '..', 'public', 'images');

// Ensure directory exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

async function generatePlaceholder(index) {
  const color = colors[index - 1];
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="${color}"/>
      <circle cx="200" cy="160" r="60" fill="white" opacity="0.9"/>
      <rect x="140" y="240" width="120" height="140" rx="10" fill="white" opacity="0.9"/>
      <text x="200" y="170" font-family="Arial, sans-serif" font-size="48" fill="${color}" text-anchor="middle">
        ${index}
      </text>
    </svg>
  `;

  const buffer = Buffer.from(svg);
  const outputPath = path.join(imagesDir, `placeholder-person-${index}.jpg`);

  await sharp(buffer).jpeg({ quality: 80 }).toFile(outputPath);

  console.log(`Generated ${outputPath}`);
}

async function main() {
  console.log('Generating placeholder images...');

  for (let i = 1; i <= 10; i++) {
    await generatePlaceholder(i);
  }

  console.log('Placeholder images generated successfully!');
}

main().catch(console.error);
