const { getRoom, updateRoom } = require('./roomService');
const { rollDice } = require('../handlers/handlersFunctions');
const { sendToPlayersRolledNumber, sendToPlayersData } = require('../socket/emits');

const BOT_NAMES = [
    'RoboLudo',
    'AI Master',
    'Bot Champion',
    'Smart Bot',
    'Dice Master',
    'Lucky Bot'
];

const BOT_MOVE_DELAY = 100; // 0.1 seconds - fast but visible
const BOT_ROLL_DELAY = 0; // 0 seconds - instant roll

/**
 * Add a bot player to a room
 */
async function addBotToRoom(roomId) {
    try {
        const room = await getRoom(roomId);
        
        if (!room || room.isFull() || room.started) {
            console.log('⚠️ Cannot add bot - room full or started');
            return false;
        }
        
        const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        
        room.addPlayer(botName, `bot-${Date.now()}`, null);
        
        const addedPlayer = room.players[room.players.length - 1];
        addedPlayer.ready = true; // Bot is always ready
        addedPlayer.isBot = true; // Mark as bot
        
        const updatedRoom = await updateRoom(room);
        
        console.log(`🤖 Bot "${botName}" added to room ${roomId}`);
        
        // Send updated room data to all players
        if (updatedRoom) {
            sendToPlayersData(updatedRoom);
        }
        
        return true;
    } catch (error) {
        console.error('Error adding bot to room:', error);
        return false;
    }
}

/**
 * Make bot roll the dice
 */
async function botRoll(roomId) {
    try {
        const room = await getRoom(roomId);
        
        if (!room || room.winner) return;
        
        const currentPlayer = room.getCurrentlyMovingPlayer();
        if (!currentPlayer || !currentPlayer.isBot) {
            console.log('⚠️ botRoll called but current player is not a bot - ignoring');
            return;
        }
        
        // Check if bot can roll
        if (room.rolledNumber !== null && room.rolledNumber !== 6) {
            console.log('🤖 Bot cannot roll - last roll was not a 6');
            return;
        }
        
        console.log('🎲 Bot is rolling the dice...');
        
        const rolledNumber = rollDice();
        sendToPlayersRolledNumber(roomId, rolledNumber);
        room.rolledNumber = rolledNumber;
        
        // Add to roll history
        if (!room.rollHistory) room.rollHistory = [];
        room.rollHistory.push(rolledNumber);
        
        // Check for 3 consecutive sixes
        const lastThree = room.rollHistory.slice(-3);
        if (lastThree.length === 3 && lastThree.every(roll => roll === 6)) {
            console.log('❌ Bot rolled THREE SIXES - Turn ends!');
            room.changeMovingPlayer();
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom); // Emit so frontend knows turn changed
            }
            return;
        }
        
        // If rolled a 6, extend time (but bot doesn't need it)
        if (rolledNumber === 6) {
            // Skip extending time for bot - it plays fast
            console.log('🎲 Bot rolled a 6!');
        }
        
        // Check if bot can move with this roll
        if (!currentPlayer.canMove(room, rolledNumber)) {
            console.log('🤖 Bot cannot move with this roll - changing player');
            room.changeMovingPlayer();
            room.rollHistory = [];
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom); // Emit so frontend knows turn changed
            }
            return; // Exit early - turn is over
        }
        
        const updatedRoom = await updateRoom(room);
        
        // Emit room data so frontend knows the roll happened
        if (updatedRoom) {
            sendToPlayersData(updatedRoom);
        }
        
        // Schedule bot move after a short delay
        setTimeout(() => botMove(roomId), BOT_MOVE_DELAY);
        
    } catch (error) {
        console.error('Error in botRoll:', error);
    }
}

/**
 * Make bot move a pawn
 */
async function botMove(roomId) {
    try {
        const room = await getRoom(roomId);
        
        if (!room || room.winner) return;
        
        const currentPlayer = room.getCurrentlyMovingPlayer();
        if (!currentPlayer || !currentPlayer.isBot) {
            console.log('⚠️ botMove called but current player is not a bot - ignoring');
            return;
        }
        
        // Get pawns that can move
        const pawnsThatCanMove = room.getPawnsThatCanMove();
        
        if (pawnsThatCanMove.length === 0) {
            console.log('🤖 Bot has no valid moves - changing player');
            room.changeMovingPlayer();
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom); // Emit so frontend knows turn changed
            }
            return;
        }
        
        // Simple AI: prioritize pawns that are furthest from base
        let chosenPawn;
        if (pawnsThatCanMove.length === 1) {
            chosenPawn = pawnsThatCanMove[0];
        } else {
            // Choose pawn with highest position (furthest from start)
            chosenPawn = pawnsThatCanMove.reduce((best, current) => {
                return current.position > best.position ? current : best;
            });
        }
        
        console.log(`🤖 Bot moving pawn ${chosenPawn._id} from position ${chosenPawn.position}`);
        
        const movedWithNumber = room.rolledNumber;
        // Check if moving with a 6 BEFORE removing it from history
        const movedWithSix = movedWithNumber === 6;
        
        const capturedOpponent = room.movePawn(chosenPawn, room.rolledNumber);
        
        // Remove used roll from history (the specific roll that was used)
        if (room.rollHistory && room.rollHistory.length > 0) {
            const rollIndex = room.rollHistory.indexOf(movedWithNumber);
            if (rollIndex > -1) {
                room.rollHistory.splice(rollIndex, 1);
                console.log(`📝 Bot removed roll ${movedWithNumber} from history. Remaining: [${room.rollHistory.join(', ')}]`);
            }
        }
        
        // Bot captured opponent (no need to extend time)
        if (capturedOpponent) {
            console.log('⚔️ Bot captured opponent!');
        }
        
        // Give another turn ONLY if:
        // 1. Moved with a 6 (rolled 6), OR
        // 2. Captured an opponent's pawn (killed pawn)
        // NO bonus for unused 6s in history or safe star squares
        const getAnotherTurn = movedWithSix || capturedOpponent;
        
        if (getAnotherTurn) {
            if (movedWithSix) {
                console.log('🎲 BOT: Bonus turn granted - moved with a 6!');
            }
            if (capturedOpponent) {
                console.log('⚔️ BOT: Bonus turn granted - captured opponent pawn!');
            }
        }
        
        room.rolledNumber = null;
        
        if (!getAnotherTurn) {
            room.rollHistory = [];
            room.changeMovingPlayer();
            // Emit immediately so frontend knows turn changed
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom);
            }
        } else {
            // Reset timer for bonus turn
            const MOVE_TIME = 15000;
            room.nextMoveTime = Date.now() + MOVE_TIME;
            const timeoutManager = require('../models/timeoutManager.js');
            const { makeRandomMove } = require('../handlers/handlersFunctions');
            timeoutManager.clear(room._id.toString());
            timeoutManager.set(makeRandomMove, MOVE_TIME, room._id.toString());
            console.log('🔄 Bot gets bonus turn');
        }
        
        // Check for winner
        const winner = room.getWinner();
        if (winner) {
            room.endGame(winner);
            const { sendWinner } = require('../socket/emits');
            sendWinner(room._id.toString(), winner);
            // Emit room data when game ends
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom);
            }
            return; // Game over
        }
        
        // Only update and emit if bot is continuing (has another turn)
        if (getAnotherTurn) {
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom);
            }
            // If bot gets another turn, roll again after brief delay to show the move
            setTimeout(() => botRoll(roomId), BOT_MOVE_DELAY); // Use same delay constant
        }
        // If turn ended, we already updated and emitted above (line 212-215)
        
    } catch (error) {
        console.error('Error in botMove:', error);
    }
}

/**
 * Start bot turn - roll dice immediately
 */
function startBotTurn(roomId) {
    console.log('🤖 Starting bot turn - rolling immediately...');
    // Roll immediately with no delay
    if (BOT_ROLL_DELAY > 0) {
        setTimeout(() => botRoll(roomId), BOT_ROLL_DELAY);
    } else {
        // Use setImmediate for instant execution
        setImmediate(() => botRoll(roomId));
    }
}

module.exports = {
    addBotToRoom,
    botRoll,
    botMove,
    startBotTurn
};

