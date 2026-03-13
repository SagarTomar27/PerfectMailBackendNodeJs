const mongoose = require("mongoose");

const EmailLogSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template" },
    toEmail: { type: String, default: "" },
    subject: { type: String, default: "" },
    status: { type: String, enum: ["sent", "failed"], default: "sent" },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    sgMessageId: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailLog", EmailLogSchema);
