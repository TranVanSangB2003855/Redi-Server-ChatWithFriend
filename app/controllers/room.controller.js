const config = require("../config/index");
const USER = require("../models/user.model");
const ROOM = require("../models/chatRoom.model");


exports.getdata = async (req, res) => {
  try {
    const user1 = await USER.findOne({ phone: req.body.user1 });
    const user2 = await USER.findOne({ phone: req.body.user2 });

    const room = await ROOM.findOne({
      owner: { $all: [user1, user2] }
    }).populate('owner');

    if (room) {
      res.status(200).send(room.message);
    } else {
      res.status(400).send({ message: "Phòng đã tồn tại" });
    }
  } catch (error) {
    console.error(error);
  }
};