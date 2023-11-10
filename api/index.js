const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const redi = require("../app/function/rediFunct");
const USER = require("../app/models/user.model.js");
const CHATROOM = require("../app/models/chatRoom.model.js");
const MESSAGE = require("../app/models/message.model.js");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  cookieSession({
    name: "redi-session",
    secret: "COOKIE_SECRET", // should use as secret environment variable
    httpOnly: true
  })
);

app.get("/", (res, req) => {
  req.json({ message: "Welcome to Redi Chat App." });
})

require('../app/routes/auth.route')(app);
require('../app/routes/user.route')(app);
require('../app/routes/room.route')(app);

app.use((err, req, res, next) => {
  // Middleware xử lý lỗi tập trung.
  // Trong các đoạn code xử lý ở các route, gọi next(error)
  // sẽ chuyển về middleware xử lý lỗi này
  return res.status(err.statusCode || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Socket.io cho người có tài khoản Chat
const serverForUserChat = require('http').createServer(app);

const ioForUserChat = require("socket.io")(serverForUserChat, {
  cors: {
    origins: "*",
    credentials: true
  },
});

const config = require("../app/config/index");
let jwt = require("jsonwebtoken");

ioForUserChat.use((socket, next) => {
  const token = socket.handshake.auth.token;
  //console.log("ioForUserChat: ", token);
  jwt.verify(token, config.secret, async (err, decoded) => {
    if (err) {
      console.log('Token không hợp lệ');
      return;
    }
    else {
//       console.log("ioForUserChat: Hop le");
      next();
    }
    // console.log('token', token);
  });
});

ioForUserChat.on('connection', (socket) => {
  let userPhone;
  let user;
  let chatRooms;
  //Nên có 1 event listener trên socket 'message' dùng để thông báo
  //Gửi thông tin người dùng đã nhận được từ backend:
  //  - Gửi thông tin đã online đến những người đã kết bạn (chung room)
  //data là sdt của người dùng
  socket.on('sendUser', async data => {
    userPhone = data;
    user = await USER.findOne({ phone: userPhone });
    socket.join(userPhone.toString());
    console.log("User " + user.fullName + " đã kết nối");
    chatRooms = await CHATROOM.find({ owner: user });
    chatRooms.forEach(chatRoom => {
      socket.join(chatRoom._id.toString());
      let countUser = ioForUserChat.sockets.adapter.rooms.get(chatRoom._id.toString()).size;
      if (countUser > 1) {
        //Gửi đến bạn
        socket.to(chatRoom._id.toString()).emit('onlineStatus', {
          //Nếu có làm group thì thêm userID
          roomID: chatRoom._id.toString(),
          online: true
        });

        //Gửi đến mình
        socket.emit('onlineStatus', {
          //Nếu có làm group thì thêm userID
          roomID: chatRoom._id.toString(),
          online: true
        });
      }
    });
  });

  // Các xử lý sự kiện khi người dùng đăng nhập thành công gồm: 
  //Tìm tài khoản để gửi kết bạn:
  socket.on('findUser', async targetPhone => {
    try {
      let target = await USER.findOne({ phone: targetPhone });
      //console.log("findUser", targetPhone)
      if (target) {
        let sentFriendRequest = false;
        for (let i = 0; i < target.requestContact.length; i++) {
          // console.log(target.requestContact[i]._id,user._id,target.requestContact[i]._id==user._id);
          if (target.requestContact[i]._id.toString() == user._id.toString()) {
            sentFriendRequest = true;
            //console.log("sentFriendRequest", sentFriendRequest)
            break;
          }
        }
        socket.emit('foundUser', {
          _id: target._id,
          fullName: target.fullName,
          avatar: target.avatar,
          phone: target.phone,
          sentFriendRequest: sentFriendRequest
        });
      } else {
        socket.emit('message', 'Không tìm thấy tài khoản với số điện thoại này !');
      };
    } catch (error) {
      console.error(error);
    }
  });
  //  - Gửi yêu cầu kết bạn/ Nhập yêu cầu kết bạn (có lưu vào CSDL)
  //Gửi số điện thoại người muốn kết bạn(đã có kiểm tra tồn tại)
  socket.on('sendFriendRequest', async targetPhone => {
    if (await USER.findOne({ phone: targetPhone, requestContact: user })) {
      socket.emit('message', 'Đã gửi lời mời kết bạn rồi !');
    } else {
      try {
        // const targetUser = await USER.findOne({phone: targetPhone});
        //console.log("targetPhone", targetPhone);
        //console.log("user", user);
        // await targetUser.updateOne({
        //   $push: { requestContact: user._id }
        // })
        await USER.findOneAndUpdate(
          { phone: targetPhone },
          { $push: { requestContact: user } },
          { new: true }
        );
        socket.emit('message', 'Đã gửi lời mời kết bạn !');
        socket.to(targetPhone.toString()).emit('message', 'Có một lời mời kết bạn mới !');

      } catch (error) {
        console.error(error);
      }
    }
  });

  //Chấp nhận/từ chối lời mời kết bạn
  //Template socket.io(nếu accept là false nghĩa là từ chối kết bạn):
  // {
  //   "phone":"01235",
  //   "accept":true
  // }
  socket.on('actionFriendRequest', async data => {
    let target = await USER.findOne({ phone: data.phone });
    let accept = data.accept;
    //console.log(data.phone)
    let check = await USER.findOne({ phone: user.phone, requestContact: { $in: [target] }, });
    if (check) {
      try {
        user = await USER.findOneAndUpdate(
          { phone: user.phone },
          { $pull: { requestContact: target._id } },
          { new: true }
        );

        if (accept) {
          user = await USER.findOneAndUpdate(
            { phone: user.phone },
            { $push: { contacts: target } },
            { new: true }
          );
          //Lưu vào csdl của người gửi
          await USER.findByIdAndUpdate(
            target._id,
            { $push: { contacts: user } },
            { new: true }
          );

          //Tạo phòng mới
          try {

            const room = await CHATROOM.findOne({
              owner: { $all: [user, target] }
            }).populate('owner');

            if (room) {
              socket.emit('message', 'Phòng đã tồn tại !');
            } else {
              const chatRoom = new CHATROOM({
                message: [],
                owner: [user, target],
                createAt: redi.getTime(),
                lastMessageDate: redi.getTime(),
              });
              await chatRoom.save();
              // socket.emit('message', 'Tạo thành công phòng mới trong database');
              setTimeout(() => {
                socket.emit('message', "Đã chấp nhận lời mời kết bạn của " + target.fullName + " ");
              }, 200);
              setTimeout(() => {
                socket.to(target.phone.toString()).emit("message", user.fullName + " đã chấp nhận lời mời kết bạn của bạn !")
              }, 350);
            }
          } catch (error) {
            console.error(error);
          };
        } else {
          socket.emit('message', "Đã từ chối lời mời kết bạn của " + target.fullName + " ");
        }

      } catch (error) {
        console.error(error);
      }
    } else {
      socket.emit('message', 'Người dùng không có trong danh sách kết bạn !');
    }
  });

  //Xóa bạn
  //Gửi số điện thoại của người muốn xóa(đã có kiểm tra tồn tại)
  socket.on('deleteFriend', async targetPhone => {
    let target = await USER.findOne({ phone: targetPhone });
    if (await USER.findOne({ phone: user.phone, contacts: target })) {
      try {
        user = await USER.findOneAndUpdate(
          { phone: user.phone },
          { $pull: { contacts: target._id } },
          { new: true }
        );
        socket.emit('message', 'Đã xóa kết bạn với ' + target.fullName);
      } catch (error) {
        console.error(error);
      }
    } else {
      socket.emit('message', 'Không có người này trong danh bạ');
    }
  });

  //Gửi thông tin phòng
  socket.on('loadContentChatRoom', async roomId => {
    let messages = await MESSAGE.find({ chat: roomId });
    socket.emit('receiveContentChatRoom', messages)
  });

  //Gửi thông tin đã xem tất cả tin nhắn trong phòng roomId
  socket.on('seenAllMessage', async roomId => {
    let messages = await MESSAGE.find({ $and: [{ chat: roomId }, { sender: { $ne: user._id } }] });
    messages.forEach(async message => {
      if (!message.seen) {
        await MESSAGE.findOneAndUpdate(
          { _id: message._id },
          { $set: { seen: true } },
          { new: true }
        );
      }
    })
    socket.to(roomId).emit('updateMessages', roomId);
  });

  //  - Gửi/nhận tin nhắn với bạn bè (có lưu vào CSDL)
  //Message có dạng:
  // {
  //   "roomID": "640c3823cc03aac30b541544",
  //   "content": "Tawawa with type",
  //   "type": "image"
  // }
  socket.on('sendMessageFriend', async function (message, callback) {
    //console.log(message)
    let currentRoom = await CHATROOM.findById(message.roomID);
    let createAt = redi.getTime()
    socket.to(currentRoom._id.toString()).emit('receiveMessageFriend', {
      ...message,
      sender: user._id,
      seen: false,
      createAt: createAt
    });

    if (typeof callback === 'function') {
      callback({
        "status": "ok",
        "createAt": createAt
      });
    }

    newMessage = new MESSAGE({
      content: message.content.toString(),
      sender: user,
      chat: currentRoom,
      createAt: createAt,
      seen: false,
      type: message.type.toString()
    });
    await newMessage.save();

    await CHATROOM.findOneAndUpdate(
      { _id: currentRoom._id },
      {
        $push: { message: newMessage },
        $set: { lastMessageDate: redi.getTime() }
      },
      { new: true }
    );
  })

  socket.on("disconnecting", (reason) => {
    console.log("[Socket Friend] ["+user.fullName+"] Bị ngắt kết nối do: "+reason);
  });

  //  - Khi disconnect thì cập nhật lastAccess của user tương ứng trong CSDL
  socket.on('disconnect', async () => {
    try {
      console.log("User " + user.fullName + " đã ngắt kết nối");
      chatRooms.forEach(chatRoom => {
        socket.to(chatRoom._id.toString()).emit('onlineStatus', {
          //Nếu có làm group thì thêm userID
          roomID: chatRoom._id.toString(),
          online: false
        });
        socket.leave(chatRoom._id.toString());
      });
    } catch { };
    if (user) {
      try {
        await USER.findOneAndUpdate(
          { phone: userPhone },
          { $set: { lastAccess: redi.getTime() } },
          { new: true }
        );
      } catch (error) {
        console.error(error);
      }
    }
  });
})

const MongoDB = require("../app/utils/mongodb.util");

async function startServer() {
    try {
        
        await MongoDB.connect(config.db.uri);
        console.log("Connected to the database!");

        serverForUserChat.listen(3000, () => {
            console.log('listening on *:3000');
        });

    } catch (error) {
        console.log("Cannot connect to the database!", error);
        process.exit();
    }
}

startServer();
