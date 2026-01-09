const mongoose = require("mongoose");

const StatusSchema = new mongoose.Schema({
  userid: String,
  status: String,
  type: String,
  createdat: { type: Date, default: Date.now() },
  expiredat:Date
});

const StatusModel = mongoose.model("status", StatusSchema);
module.exports = StatusModel;