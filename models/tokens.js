const mongoose = require("mongoose");

const TokensSchema = new mongoose.Schema({
  name: String,
  symbol: String,
  tokenAddress: String,
  image: String,
  netwokrs: Array,
  createdat: { type: Date, default: Date.now() },
});

const TokensModel = mongoose.model("tokens", TokensSchema);
module.exports = TokensModel;