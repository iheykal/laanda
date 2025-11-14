// Create dice images with proper dot patterns
const createDiceSVG = (number) => {
  const size = 100;
  const dotSize = 12;
  
  // Dot positions for each dice face
  const dots = {
    1: [[50, 50]], // center
    2: [[30, 30], [70, 70]], // diagonal
    3: [[30, 30], [50, 50], [70, 70]], // diagonal + center
    4: [[30, 30], [70, 30], [30, 70], [70, 70]], // corners
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]], // corners + center
    6: [[30, 30], [30, 50], [30, 70], [70, 30], [70, 50], [70, 70]] // two columns
  };
  
  const positions = dots[number] || [];
  const circles = positions.map(([cx, cy]) => 
    `<circle cx="${cx}" cy="${cy}" r="${dotSize}" fill="#1a1a1a"/>`
  ).join('');
  
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="diceGrad${number}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f0f0f0;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow${number}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="5" y="5" width="${size - 10}" height="${size - 10}" 
            fill="url(#diceGrad${number})" 
            stroke="#333" 
            stroke-width="3" 
            rx="15" 
            filter="url(#shadow${number})"/>
      ${circles}
    </svg>
  `;
};

const createRollSVG = () => {
  return `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rollGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#45a049;stop-opacity:1" />
        </linearGradient>
        <filter id="rollShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="5" y="5" width="90" height="90" 
            fill="url(#rollGrad)" 
            stroke="#2d7a2f" 
            stroke-width="3" 
            rx="15" 
            filter="url(#rollShadow)"/>
      <text x="50" y="60" 
            font-family="Arial, sans-serif" 
            font-size="28" 
            font-weight="bold" 
            text-anchor="middle" 
            fill="white">ROLL</text>
    </svg>
  `;
};

// Generate base64 encoded images
const diceImages = [
  ...Array.from({ length: 6 }, (_, i) => {
    const svg = createDiceSVG(i + 1);
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }),
  `data:image/svg+xml;base64,${btoa(createRollSVG())}`
];

export default diceImages;

