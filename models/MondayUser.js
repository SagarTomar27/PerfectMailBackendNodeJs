const mongoose = require("mongoose");

const MondayUserSchema = new mongoose.Schema({

  accountId: String,
  userId: String,
  accessToken: String

});

module.exports = mongoose.model("MondayUser", MondayUserSchema);