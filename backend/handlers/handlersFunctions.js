const { sendToPlayersRolledNumber, sendWinner } = require('../socket/emits');
const { sendToPlayersData } = require('../socket/emits');

const rollDice = () => {
    const rolledNumber = Math.floor(Math.random() * 6) + 1;
    return rolledNumber;
};

const makeRandomMove = async roomId => {
    const { updateRoom, getRoom } = require('../services/roomService');
    const room = await getRoom(roomId);
    if (room.winner) return;
    
    const currentPlayer = room.getCurrentlyMovingPlayer();
    if (!currentPlayer) return;
    
    // Check if this is a bot-controlled human player
    const isBotControlled = !currentPlayer.isBot && 
        room.botControlledPlayers && 
        room.botControlledPlayers.some(id => id.toString() === currentPlayer._id.toString());
    
    // If it's a bot or bot-controlled human, proceed with automatic moves
    if (currentPlayer.isBot || isBotControlled) {
        // Bot or bot-controlled player's turn - proceed with automatic moves
        if (room.rolledNumber === null) {
            room.rolledNumber = rollDice();
            sendToPlayersRolledNumber(room._id.toString(), room.rolledNumber);
            
            // Add to roll history
            if (!room.rollHistory) room.rollHistory = [];
            room.rollHistory.push(room.rolledNumber);
            
            // Check for 3 consecutive sixes - instant fail, turn ends
            const lastThree = room.rollHistory.slice(-3);
            if (lastThree.length === 3 && lastThree.every(roll => roll === 6)) {
                console.log(`❌ ${isBotControlled ? 'BOT-CONTROLLED PLAYER' : 'BOT'}: THREE SIXES IN A ROW - Turn ends!`);
                room.changeMovingPlayer();
                const updatedRoom = await updateRoom(room);
                if (updatedRoom) {
                    sendToPlayersData(updatedRoom);
                }
                return;
            }
            
            // If rolled a 6, extend time by 15 seconds (only for human players, not bots)
            if (room.rolledNumber === 6 && !currentPlayer.isBot) {
                room.extendTime(15000);
                console.log('🎲 BOT-CONTROLLED PLAYER: Rolled a 6! +15 seconds added');
            } else if (room.rolledNumber === 6) {
                console.log('🎲 BOT: Rolled a 6!');
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
            
            // Check if still has unused 6s in history after removal
            const stillHasSix = room.rollHistory && room.rollHistory.some(roll => roll === 6);
            
            // If captured opponent, extend time by 15 seconds (only for human players)
            if (capturedOpponent && !currentPlayer.isBot) {
                room.extendTime(15000);
                console.log('⚔️ BOT-CONTROLLED PLAYER: Captured opponent! +15 seconds added');
            } else if (capturedOpponent) {
                console.log('⚔️ BOT: Captured opponent!');
            }
        } else {
            // No valid moves - end turn
            console.log(`🤖 ${isBotControlled ? 'BOT-CONTROLLED PLAYER' : 'BOT'} has no valid moves - ending turn`);
            room.rolledNumber = null;
            room.rollHistory = [];
            room.changeMovingPlayer();
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom);
            }
            return;
        }
        
        // Check if landed on safe star square (grants bonus turn)
        const landedOnSafeStar = room._lastMoveLandedOnSafeStar || false;
        
        // Give another turn if:
        // 1. Moved with a 6, OR still has a 6 in roll history, OR
        // 2. Captured an opponent's pawn, OR
        // 3. Landed on a safe star square
        const getAnotherTurn = movedWithSix || stillHasSix || capturedOpponent || landedOnSafeStar;
        
        if (landedOnSafeStar) {
            console.log(`⭐ ${isBotControlled ? 'BOT-CONTROLLED PLAYER' : 'BOT'}: Landed on safe star square - bonus turn granted!`);
        }
        
        // Always reset current dice after moving
        room.rolledNumber = null;
        
        if (!getAnotherTurn) {
            // Turn is ending, clear history and change player
            room.rollHistory = [];
            room.changeMovingPlayer();
        } else {
            // Gets another turn - reset timer
            const MOVE_TIME = 15000;
            const timeoutManager = require('../models/timeoutManager.js');
            room.nextMoveTime = Date.now() + MOVE_TIME;
            timeoutManager.clear(room._id.toString());
            timeoutManager.set(makeRandomMove, MOVE_TIME, room._id.toString());
            console.log(`🔄 ${isBotControlled ? 'BOT-CONTROLLED PLAYER' : 'BOT'}: Bonus turn granted - timer reset`);
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
        return;
    }
    
    // Human player's time expired without rolling - start bot control
    if (room.rolledNumber === null) {
        console.log(`⏰ Human player ${currentPlayer.color} time expired without rolling - starting bot control`);
        
        // Add player to botControlledPlayers if not already there
        if (!room.botControlledPlayers) {
            room.botControlledPlayers = [];
        }
        const playerIdStr = currentPlayer._id.toString();
        if (!room.botControlledPlayers.some(id => id.toString() === playerIdStr)) {
            room.botControlledPlayers.push(currentPlayer._id);
            console.log(`🤖 Added ${currentPlayer.color} to bot-controlled players`);
        }
        
        // Start bot actions for this player immediately
        const updatedRoom = await updateRoom(room);
        if (updatedRoom) {
            sendToPlayersData(updatedRoom);
            // Trigger bot action immediately
            setImmediate(() => makeRandomMove(roomId));
        }
        return;
    }
    
    // Human player's time expired but they had rolled - just end their turn
    console.log('⏰ Human player time expired - ending turn');
    room.rolledNumber = null;
    room.rollHistory = [];
    room.changeMovingPlayer();
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
