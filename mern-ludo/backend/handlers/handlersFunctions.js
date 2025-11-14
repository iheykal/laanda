const { sendToPlayersRolledNumber, sendWinner } = require('../socket/emits');
const { sendToPlayersData } = require('../socket/emits');

const rollDice = () => {
    // Generate truly random number between 1 and 6
    // Math.random() returns 0.0 to 0.999..., so:
    // Math.random() * 6 = 0.0 to 5.999...
    // Math.floor() = 0 to 5
    // + 1 = 1 to 6
    const randomValue = Math.random();
    const rolledNumber = Math.floor(randomValue * 6) + 1;
    console.log(`🎲 Dice rolled: ${rolledNumber} (random value: ${randomValue.toFixed(4)})`);
    return rolledNumber;
};

const makeRandomMove = async roomId => {
    const { updateRoom, getRoom } = require('../services/roomService');
    const room = await getRoom(roomId);
    if (room.winner) return;
    
    // CRITICAL: Only make moves for bots! For human players, just end their turn
    const currentPlayer = room.getCurrentlyMovingPlayer();
    if (!currentPlayer || !currentPlayer.isBot) {
        // Human player's time expired - end their turn
        console.log('⏰ Human player time expired - ending turn');
        room.rolledNumber = null;
        room.rollHistory = [];
        room.changeMovingPlayer();
        const updatedRoom = await updateRoom(room);
        if (updatedRoom) {
            sendToPlayersData(updatedRoom);
        }
        return;
    }
    
    // Bot's turn - proceed with automatic moves
    if (room.rolledNumber === null) {
        room.rolledNumber = rollDice();
        sendToPlayersRolledNumber(room._id.toString(), room.rolledNumber);
        
        // Add to roll history for bot
        if (!room.rollHistory) room.rollHistory = [];
        room.rollHistory.push(room.rolledNumber);
        
        // Check for 3 consecutive sixes - instant fail, turn ends
        const lastThree = room.rollHistory.slice(-3);
        if (lastThree.length === 3 && lastThree.every(roll => roll === 6)) {
            console.log('❌ BOT: THREE SIXES IN A ROW - Turn ends!');
            room.changeMovingPlayer();
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom);
            }
            return;
        }
        
        // If rolled a 6, extend time by 15 seconds
        if (room.rolledNumber === 6) {
            room.extendTime(15000);
            console.log('🎲 BOT: Rolled a 6! +15 seconds added');
        }
    }

    const pawnsThatCanMove = room.getPawnsThatCanMove();
    let capturedOpponent = false;
    const movedWithNumber = room.rolledNumber;
    
    // Check if moving with a 6 BEFORE removing it from history
    const movedWithSix = movedWithNumber === 6;
    
    if (pawnsThatCanMove.length > 0) {
        const randomPawn = pawnsThatCanMove[Math.floor(Math.random() * pawnsThatCanMove.length)];
        capturedOpponent = room.movePawn(randomPawn);
        
        // Remove the used roll from history
        if (room.rollHistory && room.rollHistory.length > 0) {
            const rollIndex = room.rollHistory.indexOf(movedWithNumber);
            if (rollIndex > -1) {
                room.rollHistory.splice(rollIndex, 1);
            }
        }
        
        // If captured opponent, extend time by 15 seconds
        if (capturedOpponent) {
            room.extendTime(15000);
            console.log('⚔️ BOT: Captured opponent! +15 seconds added');
        }
    } else {
        // Bot has no valid moves - end turn
        console.log('🤖 Bot has no valid moves - ending turn');
        room.rolledNumber = null;
        room.rollHistory = [];
        room.changeMovingPlayer();
        const updatedRoom = await updateRoom(room);
        if (updatedRoom) {
            sendToPlayersData(updatedRoom);
        }
        return;
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
    
    // Always reset current dice after moving
    room.rolledNumber = null;
    
    if (!getAnotherTurn) {
        // Turn is ending, clear history and change player
        room.rollHistory = [];
        room.changeMovingPlayer();
    } else {
        // Bot gets another turn - reset timer
        const MOVE_TIME = 15000;
        const timeoutManager = require('../models/timeoutManager.js');
        room.nextMoveTime = Date.now() + MOVE_TIME;
        timeoutManager.clear(room._id.toString());
        timeoutManager.set(makeRandomMove, MOVE_TIME, room._id.toString());
        console.log('🔄 BOT: Bonus turn granted - timer reset');
    }
    
    const winner = room.getWinner();
    if (winner) {
        room.endGame(winner);
        sendWinner(room._id.toString(), winner);
    }
    
    const updatedRoom = await updateRoom(room);
    if (updatedRoom) {
        sendToPlayersData(updatedRoom);
    }
};

const isMoveValid = (session, pawn, room) => {
    if (session.color !== pawn.color) {
        return false;
    }
    if (session.playerId !== room.getCurrentlyMovingPlayer()._id.toString()) {
        return false;
    }
    return true;
};

module.exports = { rollDice, makeRandomMove, isMoveValid };
