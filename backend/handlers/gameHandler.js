const { getRoom, updateRoom } = require('../services/roomService');
const { sendToPlayersRolledNumber, sendWinner, sendToPlayersData } = require('../socket/emits');
const { rollDice, isMoveValid } = require('./handlersFunctions');

module.exports = socket => {
    const req = socket.request;

    const handleMovePawn = async data => {
        const room = await getRoom(req.session.roomId);
        if (room.winner) return;
        
        // Validate it's the player's turn
        const currentPlayer = room.getCurrentlyMovingPlayer();
        const requestingPlayer = room.getPlayer(req.session.playerId);
        
        if (!currentPlayer || !requestingPlayer) {
            console.log('⚠️ Invalid move request - player not found');
            return;
        }
        
        // Ensure it's the current player's turn
        if (currentPlayer._id.toString() !== requestingPlayer._id.toString()) {
            console.log(`⚠️ Invalid move - not ${requestingPlayer.color}'s turn (current: ${currentPlayer.color})`);
            return;
        }
        
        // Bots should not send move requests via socket - they use botService
        if (currentPlayer.isBot) {
            console.log('⚠️ Bot tried to move via socket - ignoring');
            return;
        }
        
        // data can be just pawnId (old way) or {pawnId, rollNumber} (new way)
        const pawnId = typeof data === 'string' ? data : data.pawnId;
        const chosenRoll = typeof data === 'object' && data.rollNumber ? data.rollNumber : room.rolledNumber;
        
        const pawn = room.getPawn(pawnId);
        
        // Validate that the roll number is valid
        if (chosenRoll && !room.rollHistory.includes(chosenRoll) && room.rolledNumber !== chosenRoll) {
            console.warn(`⚠️ Invalid roll ${chosenRoll} - not in history [${room.rollHistory}] or current roll ${room.rolledNumber}`);
            return;
        }
        
        // Validate that the pawn can actually move with this roll
        if (!pawn.canMove(chosenRoll)) {
            console.warn(`⚠️ Pawn ${pawnId} cannot move with roll ${chosenRoll}`);
            return;
        }
        
        if (isMoveValid(req.session, pawn, room)) {
            const movedWithNumber = chosenRoll;
            
            // Check if this move uses a 6 BEFORE removing it from history
            const movedWithSix = movedWithNumber === 6;
            
            // Update the pawn's position and area, check for captures
            const capturedOpponent = room.movePawn(pawn, chosenRoll);
            
            // Remove the used roll from history
            if (room.rollHistory && room.rollHistory.length > 0) {
                const rollIndex = room.rollHistory.indexOf(chosenRoll);
                if (rollIndex > -1) {
                    room.rollHistory.splice(rollIndex, 1);
                    console.log(`📝 Removed roll ${chosenRoll} from history. Remaining: [${room.rollHistory.join(', ')}]`);
                } else {
                    console.warn(`⚠️ Roll ${chosenRoll} not found in history: [${room.rollHistory.join(', ')}]`);
                }
            }
            
            // Check if still has unused 6s in history after removal
            const stillHasSix = room.rollHistory && room.rollHistory.some(roll => roll === 6);
            
            // If captured opponent, extend time by 15 seconds
            if (capturedOpponent) {
                room.extendTime(15000);
                console.log('⚔️ Captured opponent! +15 seconds added');
            }
            
            // Check if landed on safe star square (grants bonus turn)
            const landedOnSafeStar = room._lastMoveLandedOnSafeStar || false;
            
            // Give another turn if:
            // 1. Moved with a 6, OR still has a 6 in roll history, OR
            // 2. Captured an opponent's pawn, OR
            // 3. Landed on a safe star square
            const getAnotherTurn = movedWithSix || stillHasSix || capturedOpponent || landedOnSafeStar;
            
            if (landedOnSafeStar) {
                console.log('⭐ Landed on safe star square - bonus turn granted!');
            }
            
            // Always reset current dice after moving
            room.rolledNumber = null;
            
            if (!getAnotherTurn) {
                // Turn is ending, clear history and change player
                room.rollHistory = [];
                room.changeMovingPlayer();
            } else {
                // Player gets another turn - reset timer to give them full time
                const MOVE_TIME = 15000;
                room.nextMoveTime = Date.now() + MOVE_TIME;
                const timeoutManager = require('../models/timeoutManager.js');
                const { makeRandomMove } = require('./handlersFunctions');
                timeoutManager.clear(room._id.toString());
                timeoutManager.set(makeRandomMove, MOVE_TIME, room._id.toString());
                console.log('🔄 Bonus turn granted - timer reset to 15 seconds');
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
        }
    };

    const handleRollDice = async () => {
        if (!req.session.roomId) {
            console.log('⚠️ Invalid roll request - no roomId in session');
            return;
        }
        
        const room = await getRoom(req.session.roomId);
        if (!room) {
            console.log('⚠️ Invalid roll request - room not found:', req.session.roomId);
            return;
        }
        
        // Validate it's the player's turn
        const currentPlayer = room.getCurrentlyMovingPlayer();
        const requestingPlayer = room.getPlayer(req.session.playerId);
        
        if (!currentPlayer || !requestingPlayer) {
            console.log('⚠️ Invalid roll request - player not found', {
                currentPlayer: currentPlayer ? `${currentPlayer.color} (${currentPlayer._id})` : 'null',
                requestingPlayer: requestingPlayer ? `${requestingPlayer.color} (${requestingPlayer._id})` : 'null',
                sessionPlayerId: req.session.playerId,
                allPlayers: room.players.map(p => ({ id: p._id.toString(), color: p.color, nowMoving: p.nowMoving }))
            });
            return;
        }
        
        // Ensure it's the current player's turn
        if (currentPlayer._id.toString() !== requestingPlayer._id.toString()) {
            console.log(`⚠️ Invalid roll - not ${requestingPlayer.color}'s turn (current: ${currentPlayer.color})`, {
                currentPlayerId: currentPlayer._id.toString(),
                requestingPlayerId: requestingPlayer._id.toString(),
                sessionPlayerId: req.session.playerId
            });
            return;
        }
        
        // Bots should not send roll requests via socket - they use botService
        if (currentPlayer.isBot) {
            console.log('⚠️ Bot tried to roll via socket - ignoring');
            return;
        }
        
        // Allow rolling only if:
        // 1. No rolled number yet (first roll), OR
        // 2. Last rolled number was a 6 (bonus roll)
        if (room.rolledNumber !== null && room.rolledNumber !== 6) {
            return; // Can't roll again if last roll wasn't a 6
        }
        
        const rolledNumber = rollDice();
        sendToPlayersRolledNumber(req.session.roomId, rolledNumber);
        room.rolledNumber = rolledNumber;
        
        // Add to roll history for this turn
        if (!room.rollHistory) room.rollHistory = [];
        room.rollHistory.push(rolledNumber);
        
        // Check for 3 consecutive sixes - instant fail, turn ends
        const lastThree = room.rollHistory.slice(-3);
        if (lastThree.length === 3 && lastThree.every(roll => roll === 6)) {
            console.log('❌ THREE SIXES IN A ROW - Turn ends!');
            room.changeMovingPlayer();
            const updatedRoom = await updateRoom(room);
            if (updatedRoom) {
                sendToPlayersData(updatedRoom);
            }
            return;
        }
        
        // If rolled a 6, extend time by 15 seconds
        if (rolledNumber === 6) {
            room.extendTime(15000);
            console.log('🎲 Rolled a 6! +15 seconds added');
        }
        
        const player = room.getPlayer(req.session.playerId);
        if (!player.canMove(room, rolledNumber)) {
            console.log(`⏰ Player ${player.color} cannot move with roll ${rolledNumber} - ending turn`);
            room.rolledNumber = null;
            room.rollHistory = [];
            room.changeMovingPlayer();
        }
        
        const updatedRoom = await updateRoom(room);
        if (updatedRoom) {
            sendToPlayersData(updatedRoom);
        }
    };

    socket.on('game:roll', handleRollDice);
    socket.on('game:move', handleMovePawn);
};
