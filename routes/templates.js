const express = require("express");
const multer = require("multer");
const router = express.Router();
const { saveTemplate, sendTemplate, listTemplates, deleteTemplate } = require("../controllers/templateController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/", listTemplates);
router.post("/save", upload.array("attachments", 10), saveTemplate);
router.post("/send", upload.array("attachments", 10), sendTemplate);
router.delete("/:id", deleteTemplate);

module.exports = router;
