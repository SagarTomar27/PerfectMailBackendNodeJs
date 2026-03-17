const mongoose = require("mongoose");
const EmailLog = require("../models/EmailLog");

const ensureDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(500).json({ error: "Database not connected" });
    return false;
  }
  return true;
};

const getTenant = (req) => ({
  accountId: req.headers["x-account-id"] || ""
});

exports.listTracking = async (req, res) => {
  if (!ensureDb(res)) return;
  const tenant = getTenant(req);
  if (!tenant.accountId) {
    return res.status(400).json({ error: "Missing accountId" });
  }

  try {
    const logs = await EmailLog.find({ accountId: tenant.accountId }).sort({ sentAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tracking logs" });
  }
};

exports.sendgridEvents = async (req, res) => {
  if (!ensureDb(res)) return;

  try {
    const events = Array.isArray(req.body) ? req.body : [];
    for (const evt of events) {
      const eventType = evt.event;
      const messageId = evt["sg_message_id"];
      if (!messageId) continue;

      if (eventType === "open") {
        await EmailLog.updateOne(
          { sgMessageId: messageId },
          { $set: { opened: true, openedAt: new Date() } }
        );
      }

      if (eventType === "click") {
        await EmailLog.updateOne(
          { sgMessageId: messageId },
          { $set: { clicked: true, clickedAt: new Date() } }
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to process events" });
  }
};

exports.openPixel = async (req, res) => {
  if (!ensureDb(res)) return;

  try {
    const trackingId = req.query.id || "";
    if (trackingId) {
      const now = new Date();
      await EmailLog.updateOne(
        { trackingId },
        {
          $set: { opened: true, lastOpenedAt: now },
          $setOnInsert: { openedAt: now },
          $inc: { openCount: 1 }
        }
      );
    }
  } catch (error) {
    // ignore tracking errors
  }

  const pixel = Buffer.from(
    "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
    "base64"
  );
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.status(200).send(pixel);
};
