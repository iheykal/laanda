/**
 * Sound Effects System
 * Based on Ludo-mg audio implementation
 */

// Sound file paths (these need to be copied from Ludo-mg assets/sounds)
const SOUND_PATHS = {
  PAWN_MOVE: '/sounds/sfx_token_move.mp3',
  DICE_ROLL: '/sounds/sfx_dice_roll.mp3',
  IN_HOME: '/sounds/sfx_in_home.mp3',
  TOKEN_KILLED: '/sounds/sfx_token_killed.mp3',
  MY_TURN: '/sounds/sfx_my_turn.mp3',
  OPP_TURN: '/sounds/sfx_opp_turn.mp3',
  WIN: '/sounds/sfx_win.mp3',
  CLICK: '/sounds/sfx_click.mp3',
  CLOCK: '/sounds/sfx_clock.mp3'
};

// Pre-load audio objects
const SOUNDS = {};

// Initialize sounds
Object.keys(SOUND_PATHS).forEach(key => {
  try {
    SOUNDS[key] = new Audio(SOUND_PATHS[key]);
    // Set volume for specific sounds
    if (key === 'IN_HOME') {
      SOUNDS[key].volume = 0.1;
    }
  } catch (error) {
    console.warn(`Failed to load sound: ${key}`, error);
  }
});

/**
 * Play a sound effect
 * @param {string} soundName - Name of the sound to play
 */
export const playSound = (soundName) => {
  try {
    const sound = SOUNDS[soundName];
    if (sound) {
      // Clone and play to allow overlapping sounds
      const soundClone = sound.cloneNode();
      soundClone.play().catch(err => {
        console.warn(`Failed to play sound: ${soundName}`, err);
      });
    }
  } catch (error) {
    console.warn(`Error playing sound: ${soundName}`, error);
  }
};

/**
 * Play pawn move sound
 */
export const playPawnMove = () => playSound('PAWN_MOVE');

/**
 * Play dice roll sound
 */
export const playDiceRoll = () => playSound('DICE_ROLL');

/**
 * Play pawn reached home sound
 */
export const playInHome = () => playSound('IN_HOME');

/**
 * Play token killed/captured sound
 */
export const playTokenKilled = () => playSound('TOKEN_KILLED');

/**
 * Play my turn sound
 */
export const playMyTurn = () => playSound('MY_TURN');

/**
 * Play opponent turn sound
 */
export const playOppTurn = () => playSound('OPP_TURN');

/**
 * Play win sound
 */
export const playWin = () => playSound('WIN');

/**
 * Play UI click sound
 */
export const playClick = () => playSound('CLICK');

/**
 * Play clock/timer sound
 */
export const playClock = () => playSound('CLOCK');

const soundEffects = {
  playSound,
  playPawnMove,
  playDiceRoll,
  playInHome,
  playTokenKilled,
  playMyTurn,
  playOppTurn,
  playWin,
  playClick,
  playClock
};

export default soundEffects;

