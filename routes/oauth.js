const express = require("express");
const router = express.Router();
const { oauthCallback } = require("../controllers/oauthController");

router.get("/callback", oauthCallback);

module.exports = router;