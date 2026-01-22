const sharp = require('sharp');
const path = require('path');

// Android adaptive icons use a 108dp canvas with a 72dp safe zone (66.67%)
// The logo should be centered in the safe zone to avoid being cut off
// Different launchers use different mask shapes (circle, squircle, rounded square)
// so we need extra padding to ensure the logo looks good in all cases
const CANVAS_SIZE = 1024; // Output size
const LOGO_RATIO = 0.38; // Logo takes 38% of canvas to fit well in all mask shapes

async function generateAdaptiveIcon() {
  const inputPath = path.join(__dirname, '../assest/img/wern-logo.png');
  const outputPath = path.join(__dirname, '../assest/img/adaptive-icon.png');

  try {
    // Calculate logo size (centered in safe zone)
    const logoSize = Math.floor(CANVAS_SIZE * LOGO_RATIO);
    const padding = Math.floor((CANVAS_SIZE - logoSize) / 2);

    // Create the adaptive icon with proper padding
    await sharp(inputPath)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 27, g: 138, b: 158, alpha: 1 } // #1B8A9E
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 27, g: 138, b: 158, alpha: 1 } // #1B8A9E
      })
      .png()
      .toFile(outputPath);

    console.log('Adaptive icon generated successfully!');
    console.log(`Output: ${outputPath}`);
    console.log(`Canvas size: ${CANVAS_SIZE}px`);
    console.log(`Logo size: ${logoSize}px`);
    console.log(`Padding: ${padding}px on each side`);
  } catch (error) {
    console.error('Error generating adaptive icon:', error.message);
    process.exit(1);
  }
}

generateAdaptiveIcon();
