const mongoose = require("mongoose");

const EmailAccountSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["google", "microsoft"], required: true },
    email: { type: String, required: true },
    displayName: { type: String, default: "" },
    accessToken: { type: String, default: "" },
    refreshToken: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailAccount", EmailAccountSchema);
