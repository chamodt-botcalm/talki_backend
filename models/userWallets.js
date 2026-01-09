const mongoose = require("mongoose");

const UserWalletsSchema = new mongoose.Schema({
  uid: String,
  walletName: String,
  walletAddress: String,
});

const UserWalletsModel = mongoose.model("userWallets", UserWalletsSchema);
module.exports = UserWalletsModel;
