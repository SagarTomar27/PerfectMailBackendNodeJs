const express = require("express");
const router = express.Router();
const { listTracking, sendgridEvents } = require("../controllers/trackingController");

router.get("/", listTracking);
router.post("/sendgrid/events", sendgridEvents);

module.exports = router;
