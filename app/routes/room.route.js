const controller = require("../controllers/room.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });


  //Chưa làm chức năng lấy một phần(không lấy toàn bộ tin nhắn)
  //Gửi htt prequest theo dạng
  //{
  //  "user1":"01235",
  //  "user2":"98765"
  //}
  app.get(
    "/api/room/getdata", 
    controller.getdata
  );
};