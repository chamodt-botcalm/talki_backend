const mongoose = require("mongoose");

const MutedChatsSchema = new mongoose.Schema({
  userid: String,
  muted_userid: String,
  createdat: { type: Date, default: Date.now() },
});

const MutedChatsModel = mongoose.model("mutedChats", MutedChatsSchema);
module.exports = MutedChatsModel;