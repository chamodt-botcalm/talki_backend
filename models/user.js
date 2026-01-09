const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  username: String,
  image: String,
  walletName: String,
  walletAddress: String,
  bio: String,
  fcmtoken: String,
  privateKey: String,
  profileSetup:{ type: Number, default: 0 },
  privatekeyToAccount: { type: Boolean, default: false },
  messagePreview: { type: Boolean, default: true },
  notifications: { type: Boolean, default: true },
});

const UserModel = mongoose.model("user", UserSchema);
module.exports = UserModel;
