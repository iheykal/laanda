const mongoose = require('mongoose');
const { COLORS, MOVE_TIME } = require('../utils/constants');
const { makeRandomMove } = require('../handlers/handlersFunctions');
const timeoutManager = require('./timeoutManager.js');
const PawnSchema = require('./pawn');
const PlayerSchema = require('./player');

const RoomSchema = new mongoose.Schema({
    name: String,
    private: { type: Boolean, default: false },
    password: String,
    createDate: { type: Date, default: Date.now },
    started: { type: Boolean, default: false },
    full: { type: Boolean, default: false },
    nextMoveTime: Number,
    rolledNumber: Number,
    rollHistory: { type: [Number], default: [] },
    players: [PlayerSchema],
    winner: { type: String, default: null },
    botControlledPlayers: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // Players being controlled by bots due to timeout/disconnect
    // BETTING SYSTEM FIELDS
    betAmount: { type: Number, default: 0 }, // Bet per player
    requiresBet: { type: Boolean, default: false }, // Is this a betting game?
    totalPot: { type: Number, default: 0 }, // Total money in pot
    playerBets: [{  // Track who paid
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        color: String,
        betAmount: Number,
        paid: { type: Boolean, default: false }
    }],
    settled: { type: Boolean, default: false }, // Money distributed?
    pawns: {
        type: [PawnSchema],
        default: () => {
            const startPositions = [];
            // Changed to 8 pawns for 2-player game (2 players × 4 pawns each)
            for (let i = 0; i < 8; i++) {
                let pawn = {};
                pawn.basePos = i;
                pawn.position = i; // Start at base position
                if (i < 4) {
                    pawn.color = COLORS[0]; // blue
                } else if (i < 8) {
                    pawn.color = COLORS[1]; // red
                }
                startPositions.push(pawn);
            }
            return startPositions;
        },
    },
});

// Add indexes for common queries to improve performance
RoomSchema.index({ full: 1, started: 1 }); // For finding joinable rooms
RoomSchema.index({ started: 1 }); // For finding active games
RoomSchema.index({ createDate: -1 }); // For sorting rooms by date

RoomSchema.methods.beatPawns = function (position, attackingPawnColor) {
    // Safe positions where pawns cannot be captured (starting positions for each color)
    const SAFE_POSITIONS = [16, 29, 42, 55];
    
    // Don't capture on safe positions
    if (SAFE_POSITIONS.includes(position)) {
        console.log(`🛡️ Position ${position} is safe - no capture allowed`);
        return false;
    }
    
    const pawnsOnPosition = this.pawns.filter(pawn => pawn.position === position);
    let capturedOpponent = false;
    
    pawnsOnPosition.forEach(pawn => {
        if (pawn.color !== attackingPawnColor) {
            const index = this.getPawnIndex(pawn._id);
            const oldPosition = this.pawns[index].position;
            this.pawns[index].position = this.pawns[index].basePos;
            capturedOpponent = true;
            console.log(`⚔️ ${attackingPawnColor} captured ${pawn.color} pawn at position ${oldPosition} (moved to base ${this.pawns[index].basePos})`);
        }
    });
    
    if (pawnsOnPosition.length > 0 && !capturedOpponent) {
        console.log(`ℹ️ Position ${position} has ${pawnsOnPosition.length} pawn(s) but all are same color (${attackingPawnColor})`);
    }
    
    return capturedOpponent;
};

RoomSchema.methods.extendTime = function (milliseconds = 15000) {
    const currentPlayer = this.getCurrentlyMovingPlayer();
    
    // Bots don't need time extensions - they play instantly
    if (currentPlayer && currentPlayer.isBot) {
        console.log('🤖 Bot player - skipping time extension');
        return;
    }
    
    // Add time to the current move timer (only for human players)
    this.nextMoveTime = this.nextMoveTime + milliseconds;
    
    // Update the timeout (only for human players)
    timeoutManager.clear(this._id.toString());
    const remainingTime = this.nextMoveTime - Date.now();
    if (remainingTime > 0) {
        timeoutManager.set(makeRandomMove, remainingTime, this._id.toString());
    }
};

RoomSchema.methods.changeMovingPlayer = function () {
    if (this.winner) return;
    const playerIndex = this.players.findIndex(player => player.nowMoving === true);
    let oldPlayer = null;
    
    // Handle case where no player is currently moving (game state inconsistency)
    if (playerIndex === -1) {
        console.warn('⚠️ No player marked as moving - setting first player as moving');
        if (this.players.length > 0) {
            this.players[0].nowMoving = true;
        } else {
            console.error('❌ Cannot change moving player - no players in room');
            return;
        }
    } else {
        oldPlayer = this.players[playerIndex];
        this.players[playerIndex].nowMoving = false;
        if (playerIndex + 1 === this.players.length) {
            this.players[0].nowMoving = true;
        } else {
            this.players[playerIndex + 1].nowMoving = true;
        }
    }
    this.nextMoveTime = Date.now() + MOVE_TIME;
    this.rolledNumber = null;
    this.rollHistory = [];
    timeoutManager.clear(this._id.toString());
    
    // Check if the new moving player is a bot or bot-controlled
    const newMovingPlayer = this.getCurrentlyMovingPlayer();
    const isBotControlled = newMovingPlayer && 
        !newMovingPlayer.isBot && 
        this.botControlledPlayers && 
        this.botControlledPlayers.some(id => id.toString() === newMovingPlayer._id.toString());
    
    console.log(`🔄 Turn changed: ${oldPlayer?.color || 'unknown'} → ${newMovingPlayer?.color || 'unknown'} (${newMovingPlayer?.isBot ? 'BOT' : isBotControlled ? 'BOT-CONTROLLED' : 'HUMAN'})`);
    
    if (newMovingPlayer && newMovingPlayer.isBot) {
        console.log('🤖 Bot turn detected - scheduling bot action immediately');
        // Don't set timeout for bots - they play immediately
        const { startBotTurn } = require('../services/botService');
        // Use setImmediate to ensure bot rolls right away
        setImmediate(() => startBotTurn(this._id.toString()));
    } else if (isBotControlled) {
        // Bot-controlled human player - start bot actions immediately
        console.log(`🤖 Bot-controlled player ${newMovingPlayer.color} turn - starting bot actions immediately`);
        setImmediate(() => makeRandomMove(this._id.toString()));
    } else {
        // Only set timeout for regular human players
        console.log(`⏰ Human player ${newMovingPlayer?.color || 'unknown'} turn - setting ${MOVE_TIME}ms timeout`);
        timeoutManager.set(makeRandomMove, MOVE_TIME, this._id.toString());
    }
};

RoomSchema.methods.movePawn = function (pawn, rolledNumber = null) {
    const rollToUse = rolledNumber || this.rolledNumber;
    const newPosition = pawn.getPositionAfterMove(rollToUse);
    this.changePositionOfPawn(pawn, newPosition);
    const capturedOpponent = this.beatPawns(newPosition, pawn.color);
    
    // Store if landed on safe star square (for bonus turn)
    // Safe star positions: 24, 37, 50, 63 (out-9, out-22, out-35, out-48)
    const SAFE_STAR_POSITIONS = [24, 37, 50, 63];
    this._lastMoveLandedOnSafeStar = SAFE_STAR_POSITIONS.includes(newPosition);
    
    return capturedOpponent;
};

RoomSchema.methods.getPawnsThatCanMove = function () {
    const movingPlayer = this.getCurrentlyMovingPlayer();
    const playerPawns = this.getPlayerPawns(movingPlayer.color);
    return playerPawns.filter(pawn => pawn.canMove(this.rolledNumber));
};

RoomSchema.methods.changePositionOfPawn = function (pawn, newPosition) {
    const pawnIndex = this.getPawnIndex(pawn._id);
    this.pawns[pawnIndex].position = newPosition;
};

RoomSchema.methods.canStartGame = function () {
    return this.players.filter(player => player.ready).length >= 2;
};

RoomSchema.methods.startGame = async function () {
    this.started = true;
    this.nextMoveTime = Date.now() + MOVE_TIME;
    this.players.forEach(player => (player.ready = true));
    this.players[0].nowMoving = true;
    
    // NEW: If betting game, track bet info (no deduction yet)
    if (this.requiresBet && this.betAmount > 0) {
        const User = require('./user');
        
        console.log(`🎰 Starting betting game - Bet: $${this.betAmount} per player (will be settled at end)`);
        
        for (const player of this.players) {
            // Find user by userId stored in player
            if (player.userId) {
                const user = await User.findById(player.userId);
                
                if (user) {
                    // Track the bet (don't deduct yet)
                    this.playerBets.push({
                        userId: user._id,
                        username: user.username,
                        color: player.color,
                        betAmount: this.betAmount,
                        paid: false // Will be settled at game end
                    });
                    
                    console.log(`📝 Tracked bet for ${user.username} (${player.color}): $${this.betAmount}`);
                } else {
                    console.error(`❌ User not found: ${player.name}`);
                }
            }
        }
        
        this.totalPot = this.betAmount * this.playerBets.length;
        console.log(`💰 Total pot (will be settled): $${this.totalPot}`);
    }
    
    // Check if first player is a bot - if so, start immediately
    const firstPlayer = this.players[0];
    if (firstPlayer && firstPlayer.isBot) {
        console.log('🤖 First player is a bot - starting immediately');
        const { startBotTurn } = require('../services/botService');
        setImmediate(() => startBotTurn(this._id.toString()));
    } else {
        // Only set timeout for human players
        timeoutManager.set(makeRandomMove, MOVE_TIME, this._id.toString());
    }
};

RoomSchema.methods.endGame = async function (winner) {
    timeoutManager.clear(this._id.toString());
    this.rolledNumber = null;
    this.nextMoveTime = null;
    this.players.map(player => (player.nowMoving = false));
    this.winner = winner;
    
    // NEW: Settle bets if it's a betting game
    if (this.requiresBet && this.totalPot > 0 && !this.settled) {
        const User = require('./user');
        const GameHistory = require('./gameHistory');
        
        console.log(`🏆 Game ended! Winner: ${winner} | Pot: $${this.totalPot}`);
        console.log(`💰 Processing bets...`);
        
        // Find winner player
        const winnerPlayer = this.players.find(p => p.color === winner);
        let winnerUser = null;
        
        if (winnerPlayer && winnerPlayer.userId) {
            winnerUser = await User.findById(winnerPlayer.userId);
        }
        
        // Process all players
        for (const bet of this.playerBets) {
            const user = await User.findById(bet.userId);
            
            if (!user) {
                console.error(`❌ User not found: ${bet.username}`);
                continue;
            }
            
            if (bet.color === winner) {
                // WINNER: Add winnings (total pot minus platform fee)
                const platformFee = this.totalPot * 0.10; // 10% fee
                const winnerPayout = this.totalPot * 0.90; // 90% to winner
                
                user.balance += winnerPayout;
                
                // Update winner stats
                if (!user.stats) user.stats = {};
                user.stats.totalGames = (user.stats.totalGames || 0) + 1;
                user.stats.wins = (user.stats.wins || 0) + 1;
                user.stats.totalEarnings = (user.stats.totalEarnings || 0) + winnerPayout;
                user.stats.totalWagered = (user.stats.totalWagered || 0) + bet.betAmount;
                user.stats.currentStreak = (user.stats.currentStreak || 0) + 1;
                user.stats.bestStreak = Math.max(user.stats.bestStreak || 0, user.stats.currentStreak);
                user.stats.lastPlayedAt = new Date();
                
                await user.save();
                bet.paid = true;
                
                console.log(`🎉 WINNER: ${user.username}`);
                console.log(`💰 Added: $${winnerPayout.toFixed(2)} (90% of pot)`);
                console.log(`💼 Platform Fee: $${platformFee.toFixed(2)} (10%)`);
                console.log(`💵 New balance: $${user.balance.toFixed(2)}`);
                console.log(`📊 Stats: ${user.stats.wins}W/${user.stats.losses}L, Streak: ${user.stats.currentStreak}`);
                
                // Emit balance update to winner
                try {
                    const socketManager = require('../socket/socketManager');
                    socketManager.getIO().to(this._id.toString()).emit('balance:update', {
                        userId: user._id.toString(),
                        newBalance: user.balance,
                        added: winnerPayout,
                        reason: 'game_win'
                    });
                } catch (socketErr) {
                    console.error('Socket emit error:', socketErr);
                }
            } else {
                // LOSER: Deduct bet amount
                user.balance -= bet.betAmount;
                
                // Update loser stats
                if (!user.stats) user.stats = {};
                user.stats.totalGames = (user.stats.totalGames || 0) + 1;
                user.stats.losses = (user.stats.losses || 0) + 1;
                user.stats.totalWagered = (user.stats.totalWagered || 0) + bet.betAmount;
                user.stats.currentStreak = 0; // Reset streak on loss
                user.stats.lastPlayedAt = new Date();
                
                await user.save();
                bet.paid = true;
                
                console.log(`💸 LOSER: ${user.username}`);
                console.log(`💔 Deducted: $${bet.betAmount.toFixed(2)}`);
                console.log(`💵 New balance: $${user.balance.toFixed(2)}`);
                console.log(`📊 Stats: ${user.stats.wins}W/${user.stats.losses}L`);
                
                // Emit balance update to loser
                try {
                    const socketManager = require('../socket/socketManager');
                    socketManager.getIO().to(this._id.toString()).emit('balance:update', {
                        userId: user._id.toString(),
                        newBalance: user.balance,
                        deducted: bet.betAmount,
                        reason: 'game_loss'
                    });
                } catch (socketErr) {
                    console.error('Socket emit error:', socketErr);
                }
            }
        }
        
        if (winnerUser) {
            const platformFee = this.totalPot * 0.10;
            const winnerPayout = this.totalPot * 0.90;
            
            // Save to game history
            const gameRecord = new GameHistory({
                roomId: this._id.toString(),
                players: this.playerBets.map(bet => ({
                    userId: bet.userId,
                    username: bet.username,
                    betAmount: bet.betAmount,
                    isWinner: bet.color === winner
                })),
                betAmount: this.betAmount,
                totalPot: this.totalPot,
                winnerId: winnerUser._id,
                winnerPayout: winnerPayout,
                platformFee: platformFee,
                startedAt: this.createDate,
                completedAt: new Date()
            });
            
            await gameRecord.save();
            this.settled = true;
            
            console.log(`✅ Game history saved (ID: ${gameRecord._id})`);
            
            // Emit payout notification via socket
            try {
                const socketManager = require('../socket/socketManager');
                socketManager.getIO().to(this._id.toString()).emit('game:payout', {
                    winner: winnerUser.username,
                    color: winner,
                    amount: winnerPayout,
                    platformFee: platformFee,
                    totalPot: this.totalPot
                });
            } catch (socketErr) {
                console.error('Socket emit error:', socketErr);
            }
        } else {
            console.error(`❌ Winner player not found or no userId: ${winner}`);
        }
    }
    
    await this.save();
};

RoomSchema.methods.getWinner = function () {
    // Check if any player has all 4 pawns at their finish line
    const finishLines = {
        red: 73,
        blue: 79,
        green: 85,
        yellow: 91
    };
    
    for (const [color, finishPos] of Object.entries(finishLines)) {
        const finishedPawns = this.pawns.filter(pawn => 
            pawn.color === color && pawn.position === finishPos
        );
        if (finishedPawns.length === 4) {
            return color;
        }
    }
    
    return null;
};

RoomSchema.methods.isFull = function () {
    // Changed to 2 players for 2v2 matching
    if (this.players.length === 2) {
        this.full = true;
    }
    return this.full;
};

RoomSchema.methods.getPlayer = function (playerId) {
    return this.players.find(player => player._id.toString() === playerId.toString());
};

RoomSchema.methods.addPlayer = function (name, id, userId = null) {
    if (this.full) return;
    this.players.push({
        sessionID: id,
        name: name,
        ready: false,
        color: COLORS[this.players.length],
        userId: userId, // NEW: Store user ID for wallet integration
    });
};

RoomSchema.methods.getPawnIndex = function (pawnId) {
    return this.pawns.findIndex(pawn => pawn._id.toString() === pawnId.toString());
};

RoomSchema.methods.getPawn = function (pawnId) {
    return this.pawns.find(pawn => pawn._id.toString() === pawnId.toString());
};

RoomSchema.methods.getPlayerPawns = function (color) {
    return this.pawns.filter(pawn => pawn.color === color);
};

RoomSchema.methods.getCurrentlyMovingPlayer = function () {
    return this.players.find(player => player.nowMoving === true);
};

const Room = mongoose.model('Room', RoomSchema);

module.exports = Room;
