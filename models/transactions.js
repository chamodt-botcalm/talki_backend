const mongoose = require("mongoose");

const TransactionsSchema = new mongoose.Schema({
  userid: String,
  fromAddress: String,
  toAddress: String,
  tokenAddress: String,
  transactionHash:String,
  status:String,
  type:String,
  transactionType:String,
  amount: { type: Number, default: 0 },
  createdat: { type: Date, default: Date.now() },
});

const TransactionsModel = mongoose.model("transactions", TransactionsSchema);
module.exports = TransactionsModel;