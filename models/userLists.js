const mongoose = require("mongoose");

const UserListsSchema = new mongoose.Schema({
  user1: String,
  user2: String,
  notificationsUser1:Boolean,
  notificationsUser2:Boolean,
  blockedUser1:Boolean,
  blockedUser2:Boolean,
  createdat: { type: Date, default: Date.now() },
});

const UserListsModel = mongoose.model("userLists", UserListsSchema);
module.exports = UserListsModel;