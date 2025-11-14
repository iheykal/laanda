import { START_CELLS, END_CELLS, AREAS } from '../constants/boardPositions';

/**
 * Pawn class representing a game piece
 * Based on Ludo-mg's simpler position system
 */
export class Pawn {
  constructor(id, color) {
    this.id = id;
    this.name = `${color}-${id}`;
    this.color = color;
    this.startCell = START_CELLS[color];
    this.endCell = END_CELLS[color];
    this.currentCell = `${color}-private-${id}`;
    this.area = AREAS.PRIVATE; // private, outer, last-line, home
  }

  /**
   * Calculate the next cell position based on dice value
   * @param {number} diceValue - The dice roll value (1-6)
   * @returns {Object} - {cell: number, area: string}
   */
  getNextCell(diceValue) {
    const next = {
      cell: 0,
      area: AREAS.OUTER
    };

    const currentCell = parseInt(this.currentCell);
    const startCell = parseInt(this.startCell);
    const endCell = parseInt(this.endCell);
    const nextCell = currentCell + diceValue;

    if (this.area === AREAS.PRIVATE) {
      // Move from private area to starting position
      next.area = AREAS.OUTER;
      next.cell = this.startCell;
    } else if (this.area === AREAS.OUTER) {
      // Check if pawn is entering the last line (home stretch)
      if ((currentCell >= endCell - 6 && currentCell <= endCell) && nextCell > endCell) {
        next.area = AREAS.LAST_LINE;
        const remaining = nextCell - endCell;
        next.cell = remaining;
        
        // Check if pawn reached home (position 6 in last line)
        if (remaining === 6) {
          next.cell = 0;
          next.area = AREAS.HOME;
        }
      } else {
        // Normal movement on outer track
        if (nextCell > 52) {
          // Wrap around the board
          const remaining = nextCell - 52;
          next.cell = remaining;
        } else {
          next.cell = nextCell;
        }
      }
    } else if (this.area === AREAS.LAST_LINE) {
      // Moving in the last line towards home
      if (nextCell === 6) {
        next.cell = 0;
        next.area = AREAS.HOME;
      } else {
        next.cell = nextCell;
        next.area = AREAS.LAST_LINE;
      }
    }

    return next;
  }

  /**
   * Check if the pawn can move with the given dice value
   * @param {number} diceValue - The dice roll value
   * @returns {boolean}
   */
  canMove(diceValue) {
    if (this.area === AREAS.PRIVATE) {
      // Can only leave private area on a 6
      return diceValue === 6;
    } else if (this.area === AREAS.HOME) {
      // Already home, cannot move
      return false;
    } else if (this.area === AREAS.LAST_LINE) {
      // Can only move if it doesn't go beyond home
      return parseInt(this.currentCell) + diceValue <= 6;
    } else {
      // In outer area, can always move
      return true;
    }
  }
}

export default Pawn;

