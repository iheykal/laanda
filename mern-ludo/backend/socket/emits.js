const socketManager = require('./socketManager');

const sendToPlayersRolledNumber = (roomId, rolledNumber) => {
    const connectedClients = socketManager.getIO().sockets.adapter.rooms.get(roomId.toString());
    const clientCount = connectedClients ? connectedClients.size : 0;
    console.log(`🎲 Broadcasting dice roll ${rolledNumber} to room ${roomId} (${clientCount} clients connected)`);
    
    if (clientCount === 0) {
        console.warn(`⚠️ No clients connected to room ${roomId} - dice roll won't be received!`);
    }
    
    socketManager.getIO().to(roomId.toString()).emit('game:roll', rolledNumber);
};

const sendToPlayersData = room => {
    if (!room || !room._id) {
        console.error('❌ sendToPlayersData: Invalid room object', room);
        return;
    }
    const roomId = room._id.toString();
    const nowMovingPlayer = room.players?.find(p => p.nowMoving);
    const connectedClients = socketManager.getIO().sockets.adapter.rooms.get(roomId);
    const clientCount = connectedClients ? connectedClients.size : 0;
    console.log(`📤 Emitting room:data to room ${roomId} (${clientCount} clients connected) - ${nowMovingPlayer?.color || 'unknown'} is moving (${nowMovingPlayer?.isBot ? 'BOT' : 'HUMAN'})`);
    socketManager.getIO().to(roomId).emit('room:data', JSON.stringify(room));
};

const sendToOnePlayerData = (id, room) => {
    socketManager.getIO().to(id).emit('room:data', JSON.stringify(room));
};

const sendToOnePlayerRooms = (id, rooms) => {
    socketManager.getIO().to(id).emit('room:rooms', JSON.stringify(rooms));
};

const sendWinner = (id, winner) => {
    socketManager.getIO().to(id).emit('game:winner', winner);
};

module.exports = {
    sendToPlayersData,
    sendToPlayersRolledNumber,
    sendToOnePlayerData,
    sendToOnePlayerRooms,
    sendWinner,
};
