const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema({
  _id: String,
  sender: String,
  reciever: String,
  type: String,
  message: String,
  reply: { type: Boolean, default: false },
  replyTo: String,
  forwarded: { type: Boolean, default: false },
  forwardedFrom: String,
  replyMsg: Object,
  seen: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  senderDeleted: { type: Boolean, default: false },
  recieverDeleted: { type: Boolean, default: false },
  senderPinned: { type: Boolean, default: false },
  recieverPinned: { type: Boolean, default: false },
  senderSaved: { type: Boolean, default: false },
  recieverSaved: { type: Boolean, default: false },
  createdat: { type: Date, default: Date.now() },
  seenat: Date,
}, { _id: false });

const ChatMessageModel = mongoose.model("chatMessages", ChatMessageSchema);
module.exports = ChatMessageModel;