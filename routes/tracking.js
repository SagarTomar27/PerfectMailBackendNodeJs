const express = require("express");
const router = express.Router();
const { listTracking, sendgridEvents, openPixel } = require("../controllers/trackingController");

router.get("/", listTracking);
router.post("/sendgrid/events", sendgridEvents);
router.get("/open", openPixel);

module.exports = router;
