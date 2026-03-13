const mongoose = require("mongoose");
const EmailAccount = require("../models/EmailAccount");

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

exports.listAccounts = async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const tenant = getTenant(req);
    if (!tenant.accountId) {
      return res.status(400).json({ error: "Missing accountId" });
    }
    const accounts = await EmailAccount.find({ accountId: tenant.accountId }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to load accounts" });
  }
};
