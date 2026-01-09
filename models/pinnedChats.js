const mongoose = require("mongoose");

const PinnedChatsSchema = new mongoose.Schema({
  userid: String,
  pinned_userid: String,
  pinorder: { type: Number, default: 0 },
  createdat: { type: Date, default: Date.now() },
});

const PinnedChatsModel = mongoose.model("pinnedChats", PinnedChatsSchema);
module.exports = PinnedChatsModel;