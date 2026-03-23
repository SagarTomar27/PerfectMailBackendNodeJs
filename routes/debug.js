const express = require("express");
const router = express.Router();
const { tokenDebug } = require("../controllers/debugController");

router.get("/token", tokenDebug);

module.exports = router;
