const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema(
  {
    sender: { type: String, default: "" },
    toEmail: { type: String, default: "" },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    createUpdate: { type: Boolean, default: false },
    tracking: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "sent"], default: "draft" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
