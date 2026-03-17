const mongoose = require("mongoose");
const sgMail = require("@sendgrid/mail");
const Template = require("../models/Template");
const EmailLog = require("../models/EmailLog");
const EmailAccount = require("../models/EmailAccount");
const axios = require("axios");
const crypto = require("crypto");

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
  ccEmail: body.ccEmail || "",
  bccEmail: body.bccEmail || "",
  subject: body.subject || "",
  body: body.body || "",
  createUpdate: Boolean(body.createUpdate),
  tracking: Boolean(body.tracking)
});

const splitEmails = (value) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const sendWithSendGrid = async (payload) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
    throw new Error("SendGrid is not configured");
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const [response] = await sgMail.send({
    to: payload.toEmail,
    cc: payload.ccEmail || undefined,
    bcc: payload.bccEmail || undefined,
    from: process.env.SENDGRID_FROM,
    subject: payload.subject || "No subject",
    html: payload.body || ""
  });
  const messageId = response && response.headers ? response.headers["x-message-id"] : "";
  return { provider: "sendgrid", messageId };
};

const refreshGoogleAccessToken = async (refreshToken) => {
  const res = await axios.post("https://oauth2.googleapis.com/token", {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  return res.data.access_token;
};

const sendWithGmail = async (account, payload) => {
  const toList = splitEmails(payload.toEmail);
  const ccList = splitEmails(payload.ccEmail);
  const bccList = splitEmails(payload.bccEmail);
  const headers = [
    `To: ${toList.join(", ")}`,
    ccList.length ? `Cc: ${ccList.join(", ")}` : "",
    bccList.length ? `Bcc: ${bccList.join(", ")}` : "",
    `Subject: ${payload.subject || "No subject"}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8"
  ].filter(Boolean);
  const raw = `${headers.join("\r\n")}\r\n\r\n${payload.body || ""}`;
  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const send = async (accessToken) => {
    const res = await axios.post(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      { raw: encoded },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.data?.id || "";
  };

  try {
    const messageId = await send(account.accessToken);
    return { provider: "google", messageId };
  } catch (error) {
    if (error.response && error.response.status === 401 && account.refreshToken) {
      const newToken = await refreshGoogleAccessToken(account.refreshToken);
      await EmailAccount.findByIdAndUpdate(account._id, { accessToken: newToken });
      const messageId = await send(newToken);
      return { provider: "google", messageId };
    }
    throw error;
  }
};

const refreshMicrosoftAccessToken = async (refreshToken) => {
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access"
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data.access_token;
};

const sendWithMicrosoft = async (account, payload) => {
  const toRecipients = splitEmails(payload.toEmail).map((email) => ({
    emailAddress: { address: email }
  }));
  const ccRecipients = splitEmails(payload.ccEmail).map((email) => ({
    emailAddress: { address: email }
  }));
  const bccRecipients = splitEmails(payload.bccEmail).map((email) => ({
    emailAddress: { address: email }
  }));

  const send = async (accessToken) => {
    await axios.post(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        message: {
          subject: payload.subject || "No subject",
          body: {
            contentType: "HTML",
            content: payload.body || ""
          },
          toRecipients,
          ccRecipients,
          bccRecipients
        },
        saveToSentItems: true
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return "";
  };

  try {
    const messageId = await send(account.accessToken);
    return { provider: "microsoft", messageId };
  } catch (error) {
    if (error.response && error.response.status === 401 && account.refreshToken) {
      const newToken = await refreshMicrosoftAccessToken(account.refreshToken);
      await EmailAccount.findByIdAndUpdate(account._id, { accessToken: newToken });
      const messageId = await send(newToken);
      return { provider: "microsoft", messageId };
    }
    throw error;
  }
};

const buildTrackedHtml = (html, trackingId) => {
  const baseUrl = process.env.TRACKING_BASE_URL || "";
  if (!baseUrl || !trackingId) return html || "";
  const pixel = `<img src="${baseUrl}/api/tracking/open?id=${trackingId}" width="1" height="1" style="display:none;" alt="" />`;
  return `${html || ""}${pixel}`;
};

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

    const trackingId = crypto.randomUUID();
    const trackedPayload = {
      ...payload,
      body: buildTrackedHtml(payload.body, trackingId)
    };

    let sendResult = { provider: "sendgrid", messageId: "" };
    if (payload.sender) {
      const account = await EmailAccount.findOne({
        _id: payload.sender,
        accountId: tenant.accountId
      });
      if (!account) {
        return res.status(400).json({ error: "Invalid sender account" });
      }
      if (account.provider === "google") {
        sendResult = await sendWithGmail(account, trackedPayload);
      } else if (account.provider === "microsoft") {
        sendResult = await sendWithMicrosoft(account, trackedPayload);
      } else {
        sendResult = await sendWithSendGrid(trackedPayload);
      }
    } else {
      sendResult = await sendWithSendGrid(trackedPayload);
    }

    const template = await Template.create({ ...payload, ...tenant, status: "sent" });
    await EmailLog.create({
      accountId: tenant.accountId,
      userId: tenant.userId,
      accessToken: tenant.accessToken,
      templateId: template._id,
      toEmail: payload.toEmail,
      ccEmail: payload.ccEmail,
      bccEmail: payload.bccEmail,
      subject: payload.subject || "No subject",
      status: "sent",
      provider: sendResult.provider,
      sgMessageId: sendResult.messageId || "",
      trackingId: trackingId
    });
    res.status(201).json(template);
  } catch (error) {
    try {
      const trackingId = crypto.randomUUID();
      await EmailLog.create({
        accountId: tenant.accountId,
        userId: tenant.userId,
        accessToken: tenant.accessToken,
        templateId: null,
        toEmail: payload?.toEmail || "",
        ccEmail: payload?.ccEmail || "",
        bccEmail: payload?.bccEmail || "",
        subject: payload?.subject || "No subject",
        status: "failed",
        provider: "unknown",
        errorMessage: error?.response?.data?.error || error?.message || "Send failed",
        trackingId: trackingId
      });
    } catch (logError) {
      // ignore logging failure
    }
    res.status(500).json({ error: "Failed to send template" });
  }
};
