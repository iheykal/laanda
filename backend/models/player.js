const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PlayerSchema = new Schema({
    sessionID: String,
    name: String,
    color: String,
    ready: { type: Boolean, default: false },
    nowMoving: { type: Boolean, default: false },
    // NEW: Link to User wallet account
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    isBot: { type: Boolean, default: false }, // Bot player flag
});

PlayerSchema.methods.changeReadyStatus = function () {
    this.ready = !this.ready;
};

PlayerSchema.methods.canMove = function (room, rolledNumber) {
    const playerPawns = room.getPlayerPawns(this.color);
    for (const pawn of playerPawns) {
        if (pawn.canMove(rolledNumber)) return true;
    }
    return false;
};

module.exports = PlayerSchema;
