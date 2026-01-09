const mongoose = require("mongoose");

const LedgerSchema = new mongoose.Schema({
  userid: String,
  address: String,
  tokenAddress: String,
  balance: { type: Number, default: 0 },
  createdat: { type: Date, default: Date.now() },
});

const LedgerModel = mongoose.model("ledger", LedgerSchema);
module.exports = LedgerModel;