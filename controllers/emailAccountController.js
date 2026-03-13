const mongoose = require("mongoose");
const EmailAccount = require("../models/EmailAccount");

const ensureDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(500).json({ error: "Database not connected" });
    return false;
  }
  return true;
};

exports.listAccounts = async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const accounts = await EmailAccount.find().sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to load accounts" });
  }
};
