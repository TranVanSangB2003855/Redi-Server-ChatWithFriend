const config = require("../config/index");
const USER = require("../models/user.model");
const CHATROOM = require("../models/chatRoom.model");
const MESSAGE = require("../models/message.model");

var jwt = require("jsonwebtoken");

exports.getInfoUser = async (req, res) => {
    let token = req.body.token;
    console.log("token: ",token);
    if (!token) {
        // return res.status(403).send({ message: "No token provided!" });
        return res.send(null);
    }

    jwt.verify(token, config.secret, async (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Token không hợp lệ!" });
        }
        req.userId = decoded.id;
    });

    try {
        const user = await USER.findById(req.userId);
        console.log()
        if (user) {
            //chatRooms làm riêng với friends vì hủy kết bạn vẫn còn phòng
            let chatRooms = await CHATROOM.find({ owner: user });
            let roomInfo = [];
            chatRooms.forEach(async room => {
                let friend, lastMessage = null;
                room.owner.forEach(async owner => {
                    if (owner._id.toString() !== user._id.toString()) {
                        friend = await USER.findById(owner);
                        lastMessage = await MESSAGE.findById(room.message[room.message.length-1]);
                        roomInfo.push(
                            {
                                _id: room._id,
                                owner: room.owner,
                                lastMessageDate: room.lastMessageDate,
                                lastMessage: lastMessage,
                                fullNameFriend: friend.fullName,
                                avatar: friend.avatar,
                                online: false
                            }
                        );
                    };
                });
            });

            let friends = await USER.find({ _id: user.contacts }, { password: 0, requestContact: 0, contacts: 0, createAt: 0, lastAccess: 0, __v: 0 });
            let requestContact = await USER.find({ _id: user.requestContact }, { password: 0, requestContact: 0, contacts: 0, createAt: 0, lastAccess: 0, __v: 0 });

            const token = jwt.sign({ id: user._id }, config.secret, {
                expiresIn: 86400, // 24 hours
            });

            //Send đăng nhập ở chỗ này
            res.status(200).send({
                message: {
                    '_id': user._id,
                    'phone': user.phone,
                    'fullName': user.fullName,
                    'avatar': user.avatar,
                    'requestContact': requestContact,
                    'contacts': friends,
                    'chatRooms': roomInfo,
                    'token': token
                }
            });
        }
    } catch (error) {
        console.error(error);
    }
}

exports.updateInfo = async (req, res) => {
    try {
        let user = await USER.findById(req.body._id);
        console.log(req.body)
        await user.updateOne({ fullName: req.body.fullName });
        await user.updateOne({ avatar: req.body.avatar });
        return res.send({ message: "Updated successfully" });
    } catch (error) {
        console.log(error)
    }
};

var bcrypt = require("bcryptjs");

exports.changePassword = async (req, res) => {
    try {
        let user = await USER.findById(req.body._id);
        console.log(user)
        var passwordIsValid = bcrypt.compareSync(
            req.body.currentPassword,
            user.password
        );

        if (!passwordIsValid) {
            return res.status(401).send({ message: "Mật khẩu hiện tại chưa đúng !" });
        }
        else {
            await user.updateOne({ password: bcrypt.hashSync(req.body.password, 8) });
            return res.send({ message: "Updated successfully" });
        }
    } catch (error) {
        console.log(error)
    }
}