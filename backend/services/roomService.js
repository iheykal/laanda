const Room = require('../models/room');
const { sendToPlayersData } = require('../socket/emits');

const getRoom = async roomId => {
    return await Room.findOne({ _id: roomId }).exec();
};

const getRooms = async () => {
    // Use lean() for read-only queries to improve performance
    // Only fetch essential fields for room list
    return await Room.find({}, {
        name: 1,
        private: 1,
        players: 1,
        started: 1,
        full: 1,
        betAmount: 1,
        requiresBet: 1,
        createDate: 1
    }).lean().exec();
};

const updateRoom = async room => {
    try {
        const roomId = room._id || room.id;
        if (!roomId) {
            throw new Error('Room ID is required for update');
        }
        
        // Convert Mongoose document to plain object
        // Use lean() or toObject() to get plain JavaScript object
        const roomData = room.toObject ? room.toObject({ depopulate: true }) : { ...room };
        
        // Remove MongoDB-specific fields that shouldn't be updated directly
        const { _id, __v, createdAt, updatedAt, ...updateData } = roomData;
        
        // Use findOneAndUpdate with $set to atomically update the document
        // findOneAndUpdate doesn't check __v by default, so this avoids version conflicts
        // This is an atomic operation that won't fail due to version conflicts
        const updatedRoom = await Room.findOneAndUpdate(
            { _id: roomId },
            { 
                $set: updateData
            },
            { 
                new: true,  // Return updated document
                runValidators: true,  // Run schema validators
                // Don't check version - we're using atomic update
            }
        ).exec();
        
        if (!updatedRoom) {
            console.error(`❌ Room ${roomId} not found for update`);
            return null;
        }
        
        return updatedRoom;
    } catch (error) {
        // Log the error but don't crash - return the original room
        console.error(`❌ Error updating room ${room._id || room.id}:`, error.message);
        
        // If it's a version error, try one more time with fresh data
        if (error.name === 'VersionError') {
            try {
                console.log(`🔄 Retrying update for room ${room._id} after version conflict...`);
                // Get fresh room from database
                const freshRoom = await Room.findById(room._id || room.id).exec();
                if (freshRoom) {
                    // Convert both to plain objects and merge
                    const roomData = room.toObject ? room.toObject({ depopulate: true }) : { ...room };
                    const freshData = freshRoom.toObject ? freshRoom.toObject({ depopulate: true }) : { ...freshRoom };
                    
                    // Merge changes (roomData takes precedence)
                    const mergedData = { ...freshData, ...roomData };
                    const { _id: roomId, __v, createdAt, updatedAt, ...updateData } = mergedData;
                    
                    // Try update again
                    const retriedRoom = await Room.findOneAndUpdate(
                        { _id: roomId },
                        { $set: updateData },
                        { new: true, runValidators: true }
                    ).exec();
                    
                    if (retriedRoom) {
                        console.log(`✅ Successfully updated room ${roomId} on retry`);
                        return retriedRoom;
                    }
                }
            } catch (retryError) {
                console.error(`❌ Retry failed for room ${room._id}:`, retryError.message);
            }
        }
        
        // Return null to indicate update failed, but don't throw
        // This allows the calling code to handle the failure gracefully
        return null;
    }
};

const getJoinableRoom = async () => {
    return await Room.findOne({ full: false, started: false }).exec();
};

const createNewRoom = async data => {
    const room = new Room(data);
    await room.save();
    return room;
};

// DISABLED: MongoDB change stream watcher - too expensive and redundant
// We already emit room:data after updates, so this causes duplicate emissions
// Room.watch().on('change', async data => {
//     sendToPlayersData(await getRoom(data.documentKey._id));
// });

module.exports = { getRoom, getRooms, updateRoom, getJoinableRoom, createNewRoom };
