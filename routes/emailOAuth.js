const express = require("express");
const router = express.Router();
const {
  googleAuthStart,
  googleAuthCallback,
  microsoftAuthStart,
  microsoftAuthCallback
} = require("../controllers/oauthEmailController");

router.get("/google", googleAuthStart);
router.get("/google/callback", googleAuthCallback);

router.get("/microsoft", microsoftAuthStart);
router.get("/microsoft/callback", microsoftAuthCallback);

module.exports = router;
