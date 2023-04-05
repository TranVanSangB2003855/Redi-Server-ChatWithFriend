const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    phone: { type: String, require: true },
    fullName: { type: String, require: true },
    password: { type: String, require: true },
    avatar: { type: String },
    requestContact: [{ type: mongoose.Schema.Types.ObjectId, ref: "USER"}],
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "USER"}],
    createAt: { type: Date, require: true },
    lastAccess:  { type: Date, require: true }
})

let USER = mongoose.model("USER", userSchema);

module.exports = USER;
