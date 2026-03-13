const mongoose = require("mongoose");
const sgMail = require("@sendgrid/mail");
const Template = require("../models/Template");
const EmailLog = require("../models/EmailLog");

const ensureDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(500).json({ error: "Database not connected" });
    return false;
  }
  return true;
};

const getTenant = (req) => ({
  accountId: req.headers["x-account-id"] || "",
  userId: req.headers["x-user-id"] || "",
  accessToken: req.headers["x-access-token"] || ""
});

const requireTenant = (req, res) => {
  const tenant = getTenant(req);
  if (!tenant.accountId || !tenant.userId) {
    res.status(400).json({ error: "Missing accountId or userId" });
    return null;
  }
  return tenant;
};

const sanitizePayload = (body) => ({
  sender: body.sender || "",
  toEmail: body.toEmail || "",
  subject: body.subject || "",
  body: body.body || "",
  createUpdate: Boolean(body.createUpdate),
  tracking: Boolean(body.tracking)
});

exports.listTemplates = async (req, res) => {
  if (!ensureDb(res)) return;
  const tenant = requireTenant(req, res);
  if (!tenant) return;

  try {
    const templates = await Template.find({ accountId: tenant.accountId }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

exports.deleteTemplate = async (req, res) => {
  if (!ensureDb(res)) return;
  const tenant = requireTenant(req, res);
  if (!tenant) return;

  try {
    const deleted = await Template.findOneAndDelete({
      _id: req.params.id,
      accountId: tenant.accountId
    });
    if (!deleted) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete template" });
  }
};

exports.saveTemplate = async (req, res) => {
  if (!ensureDb(res)) return;
  const tenant = requireTenant(req, res);
  if (!tenant) return;

  try {
    const payload = sanitizePayload(req.body);
    const template = await Template.create({ ...payload, ...tenant, status: "draft" });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: "Failed to save template" });
  }
};

exports.sendTemplate = async (req, res) => {
  if (!ensureDb(res)) return;
  const tenant = requireTenant(req, res);
  if (!tenant) return;

  try {
    const payload = sanitizePayload(req.body);
    if (!payload.toEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
      return res.status(500).json({ error: "SendGrid is not configured" });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const [response] = await sgMail.send({
      to: payload.toEmail,
      from: process.env.SENDGRID_FROM,
      subject: payload.subject || "No subject",
      html: payload.body || ""
    });

    const template = await Template.create({ ...payload, ...tenant, status: "sent" });
    const messageId = response && response.headers ? response.headers["x-message-id"] : "";
    await EmailLog.create({
      accountId: tenant.accountId,
      userId: tenant.userId,
      accessToken: tenant.accessToken,
      templateId: template._id,
      toEmail: payload.toEmail,
      subject: payload.subject || "No subject",
      status: "sent",
      sgMessageId: messageId
    });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: "Failed to send template" });
  }
};
