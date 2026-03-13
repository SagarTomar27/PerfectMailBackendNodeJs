const express = require("express");
const router = express.Router();
const { listAccounts } = require("../controllers/emailAccountController");

router.get("/", listAccounts);

module.exports = router;
