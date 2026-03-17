const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema(
  {
    accountId: { type: String, default: "" },
    userId: { type: String, default: "" },
    accessToken: { type: String, default: "" },
    sender: { type: String, default: "" },
    toEmail: { type: String, default: "" },
    ccEmail: { type: String, default: "" },
    bccEmail: { type: String, default: "" },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    createUpdate: { type: Boolean, default: false },
    tracking: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "sent"], default: "draft" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
