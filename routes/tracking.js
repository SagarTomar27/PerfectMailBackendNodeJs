const express = require("express");
const router = express.Router();
const { listTracking, sendgridEvents, openPixel, clickRedirect } = require("../controllers/trackingController");

router.get("/", listTracking);
router.post("/sendgrid/events", sendgridEvents);
router.get("/open", openPixel);
router.get("/click", clickRedirect);

module.exports = router;
