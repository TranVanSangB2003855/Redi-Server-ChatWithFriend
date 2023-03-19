const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
    message: [{ type: mongoose.Schema.Types.ObjectId, ref: "MESSAGE"}],
    owner: [{ type: mongoose.Schema.Types.ObjectId, ref: "USER"}],
    createAt: { type: String, require: true },
    lastMessageDate:  { type: String, require: true }
})

let CHATROOM = mongoose.model("CHATROOM", chatRoomSchema);

module.exports = CHATROOM;