const express = require("express");
const router = express.Router();
const { boardList } = require("../controllers/mondayController");

router.get("/boards", boardList);
router.get("/", boardList);

module.exports = router;
