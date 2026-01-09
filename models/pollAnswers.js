const mongoose = require("mongoose");

const PollAnswersSchema = new mongoose.Schema({
  userid: String,
  pollid: String,
  answerid: String,
  createdat: { type: Date, default: Date.now() },
});

const PollAnswersModel = mongoose.model("polls", PollAnswersSchema);
module.exports = PollAnswersModel;