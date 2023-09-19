const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const roomSchema = new Schema({
    roomid: { type: String, required: true, unique: true },
    messages: { type: Array }
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;