const mongoose = require("mongoose");

const PollsSchema = new mongoose.Schema({
  userid: String,
  title: String,
  answers: Object,
  allowMultipleAnswers: { type: Boolean, default: true },
  createdat: { type: Date, default: Date.now() },
});

const PollsModel = mongoose.model("polls", PollsSchema);
module.exports = PollsModel;