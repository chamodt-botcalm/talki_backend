const mongoose = require("mongoose");

const CallHistorySchema = new mongoose.Schema({
  _id: String,
  sender: String,
  reciever: String,
  video: { type: Boolean, default: false },
  answered: { type: Boolean, default: false },
  createdat: { type: Date, default: Date.now() },
  answeredat:Date,
  endedat:Date,
}, { _id: false });

const CallHistoryModel = mongoose.model("callHistory", CallHistorySchema);
module.exports = CallHistoryModel;