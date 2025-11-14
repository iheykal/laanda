const { getRoom, updateRoom } = require('../services/roomService');
const { COLORS } = require('../utils/constants');
const { sendToPlayersData } = require('../socket/emits');
const User = require('../models/user');

module.exports = socket => {
    const req = socket.request;

    const handleLogin = async data => {
        const room = await getRoom(data.roomId);
        if (room.isFull()) return socket.emit('error:changeRoom');
        if (room.started) return socket.emit('error:changeRoom');
        if (room.private && room.password !== data.password) return socket.emit('error:wrongPassword');
        
        // NEW: Check if room requires betting and if user has sufficient balance
        if (room.requiresBet && room.betAmount > 0) {
            // Get userId from session (will be set from wallet login)
            const userId = req.session.userId;
            
            if (!userId) {
                return socket.emit('error:notAuthenticated', {
                    message: 'Please login through the wallet system first to play betting games.',
                    betAmount: room.betAmount
                });
            }
            
            const user = await User.findById(userId);
            
            if (!user) {
                return socket.emit('error:userNotFound', {
                    message: 'User account not found. Please login again.'
                });
            }
            
            if (user.balance < room.betAmount) {
                return socket.emit('error:insufficientBalance', {
                    message: `You need $${room.betAmount} to join this game. Your balance: $${user.balance.toFixed(2)}`,
                    required: room.betAmount,
                    current: user.balance
                });
            }
            
            console.log(`✅ ${user.username} has sufficient balance ($${user.balance}) for $${room.betAmount} bet`);
        }
        
        addPlayerToExistingRoom(room, data);
    };

    const handleExit = async () => {
        req.session.reload(err => {
            if (err) return socket.disconnect();
            req.session.destroy();
            socket.emit('redirect');
        });
    };

    const handleReady = async () => {
        const room = await getRoom(req.session.roomId);
        room.getPlayer(req.session.playerId).changeReadyStatus();
        const shouldStart = room.canStartGame();
        if (shouldStart) {
            console.log(`🎮 All players ready! Starting game...`);
            await room.startGame(); // Now async
            console.log(`✅ Game started! Room started: ${room.started}`);
        }
        // Save room to database
        const savedRoom = await updateRoom(room);
        console.log(`💾 Room saved to database - Started: ${savedRoom?.started || room.started}`);
        
        // Always get fresh room data from DB and broadcast
        const updatedRoom = await getRoom(room._id);
        if (updatedRoom) {
            sendToPlayersData(updatedRoom);
            console.log(`📡 Broadcasted room data to all players - Game started: ${updatedRoom.started}, Players: ${updatedRoom.players.length}`);
        }
    };

    const addPlayerToExistingRoom = async (room, data) => {
        // Get userId from session (if available)
        const userId = req.session.userId || null;
        room.addPlayer(data.name, null, userId); // Pass userId to addPlayer
        
        // Find the player we just added by name and userId
        const addedPlayer = room.players.find(p => 
            p.name === data.name && 
            (userId ? p.userId && p.userId.toString() === userId.toString() : true)
        );
        
        if (!addedPlayer) {
            console.error(`❌ Failed to find added player: ${data.name}`);
            return;
        }
        
        // CRITICAL FIX: For matchmaking rooms (Quick Match), auto-mark players as ready
        // This ensures the game starts immediately when 2 players join
        if (room.name && room.name.includes('Quick Match')) {
            addedPlayer.ready = true;
            console.log(`✅ Auto-marked ${data.name} as ready for matchmaking`);
        }
        
        // Check if this is a free game room that needs a bot
        if (req.session.needsBotForRoom && req.session.needsBotForRoom === room._id.toString()) {
            console.log('🤖 User joined their free game room - adding bot now');
            const { addBotToRoom } = require('../services/botService');
            
            // Add bot after a minimal delay (just enough for user to join)
            setTimeout(async () => {
                const success = await addBotToRoom(room._id.toString());
                if (success) {
                    console.log('✅ Bot added successfully to free game');
                    // Clear the flag
                    req.session.needsBotForRoom = null;
                    req.session.save();
                }
            }, 100);
        }
        
        const wasFull = room.isFull();
        if (wasFull) {
            // CRITICAL: Only start game if we have exactly 2 players
            if (room.players.length === 2) {
                console.log(`🎮 Room is full with 2 players! Starting game...`);
                const started = await room.startGame(); // Now async, returns false if can't start
                if (started) {
                    console.log(`✅ Game started successfully! Room started: ${room.started}`);
                } else {
                    console.error(`❌ Failed to start game - not enough players or validation failed`);
                }
            } else {
                console.error(`❌ Room marked as full but has ${room.players.length} players (expected 2). Cannot start game.`);
            }
        }
        
        // Save room to database using atomic update (avoids version conflicts)
        const savedRoom = await updateRoom(room);
        if (!savedRoom) {
            console.error(`❌ Failed to save room ${room._id} to database`);
            // Try to get fresh room data anyway
            const freshRoom = await getRoom(room._id);
            if (freshRoom) {
                // Find the player again in fresh room data
                const freshPlayer = freshRoom.players.find(p => 
                    p.name === data.name && 
                    (userId ? p.userId && p.userId.toString() === userId.toString() : true)
                );
                if (freshPlayer) {
                    reloadSession(freshRoom, freshPlayer._id.toString());
                }
                sendToPlayersData(freshRoom);
            }
            return;
        }
        
        console.log(`💾 Room saved to database - Started: ${savedRoom.started}, Players: ${savedRoom.players.length}`);
        
        // Reload session with the saved room BEFORE broadcasting
        // This ensures session is set correctly for all subsequent operations
        reloadSession(savedRoom, addedPlayer._id.toString());
        
        // CRITICAL: Ensure both players have valid sessions and are in the same room
        // Broadcast room data once - socket.io handles delivery reliably
        const broadcastRoomData = async () => {
            const freshRoom = await getRoom(savedRoom._id);
            if (freshRoom) {
                sendToPlayersData(freshRoom);
                console.log(`📡 Broadcasted room data - Game started: ${freshRoom.started}, Players: ${freshRoom.players.length}, Room ID: ${freshRoom._id}`);
            }
        };
        
        // Single broadcast - removed duplicate broadcasts to reduce server load
        broadcastRoomData();
    };

    // Since it is not bound to an HTTP request, the session must be manually reloaded and saved
    const reloadSession = (room, playerId = null) => {
        req.session.reload(err => {
            if (err) {
                console.error('❌ Error reloading session:', err);
                return socket.disconnect();
            }
            req.session.roomId = room._id.toString();
            
            // Use provided playerId, or find by matching name/userId, or fallback to last player
            if (playerId) {
                req.session.playerId = playerId.toString();
            } else {
                // Try to find player by name from session if available
                const player = room.players.find(p => 
                    p.name === req.session.username || 
                    (req.session.userId && p.userId && p.userId.toString() === req.session.userId.toString())
                ) || room.players[room.players.length - 1];
                req.session.playerId = player._id.toString();
            }
            
            // Find the player's color
            const sessionPlayer = room.players.find(p => p._id.toString() === req.session.playerId.toString());
            if (sessionPlayer) {
                req.session.color = sessionPlayer.color;
            } else {
                req.session.color = COLORS[room.players.length - 1];
            }
            
            req.session.save(err => {
                if (err) {
                    console.error('❌ Error saving session:', err);
                } else {
                    socket.join(room._id.toString());
                    const connectedClients = require('../socket/socketManager').getIO().sockets.adapter.rooms.get(room._id.toString());
                    const clientCount = connectedClients ? connectedClients.size : 0;
                    socket.emit('player:data', JSON.stringify({
                        roomId: req.session.roomId,
                        playerId: req.session.playerId,
                        color: req.session.color
                    }));
                    console.log(`✅ Session reloaded - Player: ${req.session.playerId}, Color: ${req.session.color}, Room: ${req.session.roomId} (${clientCount} clients in this room)`);
                }
            });
        });
    };

    socket.on('player:login', handleLogin);
    socket.on('player:ready', handleReady);
    socket.on('player:exit', handleExit);
};
