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
        const existing = await EmailLog.findOne({ sgMessageId: messageId });
        if (existing) {
          const now = new Date();
          const update = {
            opened: true,
            lastOpenedAt: now,
            openCount: (existing.openCount || 0) + 1
          };
          if (!existing.openedAt) {
            update.openedAt = now;
          }
          await EmailLog.updateOne({ _id: existing._id }, { $set: update });
        } else {
          console.log("SendGrid open event: log not found", messageId);
        }
      }

      if (eventType === "click") {
        const existing = await EmailLog.findOne({ sgMessageId: messageId });
        if (existing) {
          const now = new Date();
          const update = {
            clicked: true,
            clickedAt: now
          };
          await EmailLog.updateOne({ _id: existing._id }, { $set: update });
        } else {
          console.log("SendGrid click event: log not found", messageId);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to process events" });
  }
};

exports.openPixel = async (req, res) => {
  try {
    const trackingId = req.query.id || "";
    if (trackingId && mongoose.connection.readyState === 1) {
      const existing = await EmailLog.findOne({ trackingId });
      if (existing) {
        const now = new Date();
        const update = {
          opened: true,
          lastOpenedAt: now,
          openCount: (existing.openCount || 0) + 1
        };
        if (!existing.openedAt) {
          update.openedAt = now;
        }
        await EmailLog.updateOne({ _id: existing._id }, { $set: update });
      } else {
        console.log("Open pixel: log not found", trackingId);
      }
    } else if (!trackingId) {
      console.log("Open pixel hit without trackingId");
    }
  } catch (error) {
    // ignore tracking errors
    console.log("Open pixel error", error.message);
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
