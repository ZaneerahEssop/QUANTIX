const express = require("express");
const { searchPhotos, registerDownload } = require("../Controllers/unsplash.controller");

const router = express.Router();

router.get("/search", searchPhotos);
router.get("/photos/:photoId/download", registerDownload);

module.exports = router;


