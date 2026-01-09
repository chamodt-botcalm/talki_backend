const mongoose = require("mongoose");

const StickersSchema = new mongoose.Schema({
  packname: String,
  packicon: String,
  type: String,
  stickers: Array,
  createdat: { type: Date, default: Date.now() },
});

const StickersModel = mongoose.model("stickers", StickersSchema);
module.exports = StickersModel;