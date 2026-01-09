const mongoose = require("mongoose");

const StatusViewSchema = new mongoose.Schema({
  userid: String,
  statusid: String,
  createdat: { type: Date, default: Date.now() },
});

const StatusViewModel = mongoose.model("statusviews", StatusViewSchema);
module.exports = StatusViewModel;