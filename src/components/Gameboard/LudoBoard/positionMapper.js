/**
 * Maps backend numeric positions to Ludo-mg board cell IDs
 * Backend uses numeric positions (0-91), frontend uses cell IDs like "blue-private-1", "out-1", etc.
 */

// Base positions (pawns start here)
const BASE_POSITIONS = {
  blue: [4, 5, 6, 7],    // basePos 4-7
  red: [0, 1, 2, 3],     // basePos 0-3
  green: [8, 9, 10, 11], // basePos 8-11
  yellow: [12, 13, 14, 15] // basePos 12-15
};

// Starting positions on the outer track
const START_POSITIONS = {
  red: 16,
  blue: 55,
  green: 42,
  yellow: 29
};

// Finish line positions
const FINISH_POSITIONS = {
  red: 73,
  blue: 79,
  green: 85,
  yellow: 91
};

// Last line entry positions
const LAST_LINE_ENTRY = {
  red: 67,
  blue: 53,
  green: 40,
  yellow: 27
};

/**
 * Convert backend position to frontend cell ID
 * @param {Object} pawn - Pawn object from backend
 * @returns {string} - Cell ID for the Ludo-mg board
 */
export function mapPositionToCellId(pawn) {
  const { position, color, basePos } = pawn;
  
  // Check if pawn is in base (private area)
  if (position === basePos) {
    const colorBases = BASE_POSITIONS[color];
    const indexInBase = colorBases.indexOf(basePos) + 1;
    return `${color}-private-${indexInBase}`;
  }
  
  // Check if pawn is in last line (approaching finish)
  const lastLineEntry = LAST_LINE_ENTRY[color];
  const finishPos = FINISH_POSITIONS[color];
  
  if (position > lastLineEntry && position < finishPos) {
    const lastLinePosition = position - lastLineEntry;
    return `${color}-last-line-${lastLinePosition}`;
  }
  
  // Check if pawn has finished (at home)
  if (position === finishPos) {
    // Count how many pawns of this color have finished
    // This will be handled by the component itself
    return `${color}-home`;
  }
  
  // Pawn is on the outer track
  // Map positions 16-67 to out-1 to out-52
  let outerPosition = position;
  
  // Adjust for the outer track (52 cells total)
  if (outerPosition >= 16 && outerPosition <= 67) {
    outerPosition = outerPosition - 15; // 16 becomes 1, 67 becomes 52
  } else if (outerPosition > 67) {
    // Wrap around
    outerPosition = outerPosition - 67;
  }
  
  // Ensure position is in valid range 1-52
  if (outerPosition > 52) {
    outerPosition = outerPosition % 52;
  }
  if (outerPosition < 1) {
    outerPosition = 52 + outerPosition;
  }
  
  return `out-${outerPosition}`;
}

/**
 * Helper to get the specific home cell index for a pawn
 * @param {Array} pawns - All pawns
 * @param {Object} currentPawn - The pawn to get home index for
 * @returns {number} - Home cell index (1-4)
 */
export function getHomeIndex(pawns, currentPawn) {
  const { color } = currentPawn;
  const finishPos = FINISH_POSITIONS[color];
  
  const finishedPawns = pawns.filter(p => 
    p.color === color && p.position === finishPos
  );
  
  const index = finishedPawns.findIndex(p => p._id === currentPawn._id);
  return index + 1;
}

