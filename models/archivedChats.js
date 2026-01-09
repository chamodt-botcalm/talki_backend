const mongoose = require("mongoose");

const ArchivedChatsSchema = new mongoose.Schema({
  userid: String,
  archived_userid: String,
  createdat: { type: Date, default: Date.now() },
});

const ArchivedChatsModel = mongoose.model("archivedChats", ArchivedChatsSchema);
module.exports = ArchivedChatsModel;