const { getRooms, getRoom, updateRoom, createNewRoom } = require('../services/roomService');
const { sendToOnePlayerRooms, sendToOnePlayerData, sendWinner } = require('../socket/emits');

module.exports = socket => {
    const req = socket.request;

    const handleGetData = async () => {
        try {
            // If session has roomId, get the room
            if (!req.session.roomId) {
                console.log('⚠️ No roomId in session for handleGetData');
                return;
            }
            
            const room = await getRoom(req.session.roomId);
            
            // Check if room exists
            if (!room) {
                console.log('⚠️ Room not found for session:', req.session.roomId);
                return; // Exit early if room doesn't exist
            }
            
            // Also send player:data if session has roomId (for App.js to set playerData)
            // This ensures App.js has playerData when navigating to /game
            if (req.session.roomId && req.session.playerId) {
                socket.emit('player:data', JSON.stringify({
                    roomId: req.session.roomId.toString(),
                    playerId: req.session.playerId.toString(),
                    color: req.session.color
                }));
                console.log('📤 Sent player:data to client for room:', req.session.roomId);
            }
            
            // Handle the situation when the server crashes and any player reconnects after the time has expired
            // Typically, the responsibility for changing players is managed by gameHandler.js.
            // Only update if game has started and time has expired
            if (room.started && room.nextMoveTime && room.nextMoveTime <= Date.now()) {
                try {
                    room.changeMovingPlayer();
                    const updatedRoom = await updateRoom(room);
                    // Use updated room for sending data
                    if (updatedRoom) {
                        sendToOnePlayerData(socket.id, updatedRoom);
                        if (updatedRoom.winner) sendWinner(socket.id, updatedRoom.winner);
                        return;
                    }
                } catch (updateError) {
                    // If update fails due to version conflict, just send current room data
                    console.warn(`⚠️ Failed to update room ${room._id} in handleGetData:`, updateError.message);
                    // Continue to send current room data
                }
            }
            
            // Send room data to player
            sendToOnePlayerData(socket.id, room);
            if (room.winner) sendWinner(socket.id, room.winner);
        } catch (error) {
            console.error(`❌ Error in handleGetData:`, error.message);
            // Don't send data if there's an error
        }
    };

    const handleGetAllRooms = async () => {
        const rooms = await getRooms();
        const activeRooms = rooms.filter(r => !r.started || r.started);
        const fullRooms = rooms.filter(r => r.full);
        const waitingRooms = rooms.filter(r => !r.full && !r.started && r.players?.length === 1);
        
        console.log(`📋 Returning ${rooms.length} total rooms to client:`);
        console.log(`   - ${activeRooms.length} active rooms (started or not started)`);
        console.log(`   - ${fullRooms.length} full rooms`);
        console.log(`   - ${waitingRooms.length} waiting rooms (1 player)`);
        console.log(`   Room details:`, rooms.map(r => ({
            id: r._id,
            name: r.name,
            players: r.players?.length || 0,
            betAmount: r.betAmount,
            started: r.started,
            full: r.full,
            private: r.private
        })));
        sendToOnePlayerRooms(socket.id, rooms);
    };

    const handleCreateRoom = async data => {
        console.log(`🎯 Creating room with data:`, { 
            name: data.name, 
            betAmount: data.betAmount, 
            isMatchmaking: data.isMatchmaking,
            private: data.private 
        });
        
        const newRoom = await createNewRoom(data);
        
        if (newRoom) {
            console.log(`✅ Room created successfully:`, {
                id: newRoom._id,
                name: newRoom.name,
                betAmount: newRoom.betAmount,
                players: newRoom.players.length
            });
        } else {
            console.error(`❌ Failed to create room`);
        }
        
        // Store room info in session for bot detection
        // ONLY add bots for manually created free games (not matchmaking)
        // Matchmaking rooms should wait for real players to join
        if (data.betAmount === 0 && newRoom && !data.isMatchmaking) {
            req.session.needsBotForRoom = newRoom._id.toString();
            req.session.save();
            console.log('🎮 Free game detected - will add bot after user joins');
        } else if (data.isMatchmaking) {
            console.log('🎯 Matchmaking room created - waiting for real players');
        }
        
        sendToOnePlayerRooms(socket.id, await getRooms());
    };

    socket.on('room:data', handleGetData);
    socket.on('room:rooms', handleGetAllRooms);
    socket.on('room:create', handleCreateRoom);
};
