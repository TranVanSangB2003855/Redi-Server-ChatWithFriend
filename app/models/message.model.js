const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    content: { type: String, require: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "USER"},
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "CHATROOM"},
    createAt: { type: String, require: true },
    type:  { type: String, require: true }
})

let MESSAGE = mongoose.model("MESSAGE", messageSchema);

module.exports = MESSAGE;