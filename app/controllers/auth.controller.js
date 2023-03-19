const config = require("../config/index");
const redi = require("../function/rediFunct");
const USER = require("../models/user.model");
const CHATROOM = require("../models/chatRoom.model");

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

exports.signup = async (req, res) => {
  try {
    const checkPhone = await USER.findOne({ phone: req.body.phone });
    if (checkPhone) {
      res.status(400).send({ message: "Số điện thoại đã tồn tại !" });
    } else {
      const user = new USER({
        fullName: req.body.fullName,
        phone: req.body.phone,
        avatar: req.body.avatar,
        password: bcrypt.hashSync(req.body.password, 8),
        createAt: redi.getTime(),
        lastAccess: redi.getTime(),
        requestContact: [],
        contacts: []
      });
      await user.save();
      res.status(200).send({ message: "Đăng ký tài khoản mới thành công !!!" });
    }
  } catch (error) {
    console.error(error);
  }
};

// Làm phần SignIn, SignOut
exports.signin = async (req, res) => {
  try {
    const user = await USER.findOne({ phone: req.body.phone });
    console.log()
    if (user) {
      const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);      
      if (passwordIsValid) {
        //chatRooms làm riêng với friends vì hủy kết bạn vẫn còn phòng
        let chatRooms = await CHATROOM.find({ owner: user});
        let roomInfo = [];
        chatRooms.forEach(async room=>{
          let friend;
          room.owner.forEach(async owner=>{
            if(owner._id.toString()!==user._id.toString()){
              friend = await USER.findById(owner);
              roomInfo.push(
                { _id: room._id, 
                  owner: room.owner,
                  lastMessageDate: room.lastMessageDate,
                  fullNameFriend: friend.fullName,
                  avatar: friend.avatar,
                  online: false
                }
              );
            };
          });
        });

        let friends = await USER.find({_id: user.contacts}, { password: 0, requestContact: 0, contacts: 0,createAt: 0,lastAccess: 0,__v: 0});
        let requestContact = await USER.find({_id: user.requestContact}, { password: 0, requestContact: 0, contacts: 0,createAt: 0,lastAccess: 0,__v: 0});

        const token = jwt.sign({ id: user._id }, config.secret, {
          expiresIn: 86400, // 24 hours
        });

        //Send đăng nhập ở chỗ này
        res.status(200).send({
          message: {
            '_id':user._id,
            'phone':user.phone,
            'fullName':user.fullName,
            'avatar':user.avatar,
            'requestContact': requestContact,
            'contacts': friends,
            'chatRooms': roomInfo,
            'token': token
          }
        });
      } else {
        res.status(400).send({ message: "Mật khẩu nhập không đúng !" });
      }

    } else {
      res.status(400).send({ message: "Số điện thoại không có sẵn !" });
    }
  } catch (error) {
    console.error(error);
  }
};

exports.signout = async (req, res) => {
    try {
      const user = await USER.findOneAndUpdate(
        { phone: req.body.phone },
        { $set: { lastAccess: redi.getTime() } },
        { new: true }
      );
      console.log(req.body.phone)
      res.status(200).send({ message: "Đăng xuất thành công !"});
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "lỗi đăng xuất !" });
    }
};