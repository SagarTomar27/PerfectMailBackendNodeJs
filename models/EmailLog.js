const mongoose = require("mongoose");

const EmailLogSchema = new mongoose.Schema(
  {
    accountId: { type: String, default: "" },
    userId: { type: String, default: "" },
    accessToken: { type: String, default: "" },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template" },
    toEmail: { type: String, default: "" },
    ccEmail: { type: String, default: "" },
    bccEmail: { type: String, default: "" },
    subject: { type: String, default: "" },
    status: { type: String, enum: ["sent", "failed"], default: "sent" },
    provider: { type: String, default: "sendgrid" },
    errorMessage: { type: String, default: "" },
    trackingId: { type: String, default: "" },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
    openedAt: { type: Date },
    lastOpenedAt: { type: Date },
    openCount: { type: Number, default: 0 },
    clickedAt: { type: Date },
    lastClickedAt: { type: Date },
    clickCount: { type: Number, default: 0 },
    sgMessageId: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailLog", EmailLogSchema);
