const mongoose = require("mongoose");

const MondayUserSchema = new mongoose.Schema({

  accountId: String,
  userId: String,
  name: String,
  email: String,
  accessToken: String,
  installedAt: { type: Date, default: Date.now }

});

module.exports = mongoose.model("MondayUser", MondayUserSchema);
