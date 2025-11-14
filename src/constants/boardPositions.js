// Ludo Board Position System
// Based on simplified 52-cell outer track with 4 areas per player

export const SAFE_POSITIONS = [1, 9, 14, 22, 27, 35, 40, 48];

export const STAR_POSITIONS = [9, 22, 35, 48];

export const START_CELLS = {
  blue: 1,
  red: 14,
  green: 27,
  yellow: 40
};

export const END_CELLS = {
  blue: 51,
  red: 12,
  green: 25,
  yellow: 38
};

export const AREAS = {
  PRIVATE: 'private',
  OUTER: 'outer',
  LAST_LINE: 'last-line',
  HOME: 'home'
};

export const PAWN_COUNT = 4;
export const PLAYER_COUNT = 2; // 2-player mode (blue and red)

export const TURN_ORDER = ['blue', 'red'];

export const COLORS = {
  blue: '#2311db',
  red: '#d5151d',
  green: '#07c107',
  yellow: '#ffd100'
};

// Helper to check if a position is safe
export const isSafePosition = (position) => {
  return SAFE_POSITIONS.includes(parseInt(position));
};

// Helper to get next position on the board (wraps around)
export const getNextOuterPosition = (currentPosition, steps) => {
  let next = parseInt(currentPosition) + steps;
  if (next > 52) {
    next = next - 52;
  }
  return next;
};

