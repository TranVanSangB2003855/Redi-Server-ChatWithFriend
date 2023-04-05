const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    content: { type: String, require: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "USER"},
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "CHATROOM"},
    seen: { type: Boolean, require: true },
    createAt: { type: Date, require: true },
    type:  { type: String, require: true }
})

let MESSAGE = mongoose.model("MESSAGE", messageSchema);

module.exports = MESSAGE;
