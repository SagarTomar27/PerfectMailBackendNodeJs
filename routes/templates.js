const express = require("express");
const router = express.Router();
const { saveTemplate, sendTemplate, listTemplates, deleteTemplate } = require("../controllers/templateController");

router.get("/", listTemplates);
router.post("/save", saveTemplate);
router.post("/send", sendTemplate);
router.delete("/:id", deleteTemplate);

module.exports = router;
