import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Song from "../models/Song.js";
import { protect, adminOnly } from "../middleware/auth.js";
const router = Router();
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(here, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname).toLowerCase())
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = file.fieldname === "audio"
      ? ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-wav"].includes(file.mimetype)
      : ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(allowed ? null : new Error("Unsupported file type"), allowed);
  }
});
router.post("/songs", protect, adminOnly, upload.fields([{ name: "audio", maxCount: 1 }, { name: "cover", maxCount: 1 }]), async (req, res, next) => {
  try {
    if (!req.files?.audio?.[0]) return res.status(400).json({ message: "An audio file is required" });
    if (!req.body.title?.trim()) return res.status(400).json({ message: "Song title is required" });
    const song = await Song.create({ title: req.body.title.trim(), artist: req.body.artist, album: req.body.album, audioUrl: "/uploads/" + req.files.audio[0].filename, coverUrl: req.files.cover?.[0] ? "/uploads/" + req.files.cover[0].filename : "", uploadedBy: req.user._id });
    res.status(201).json({ song });
  } catch (error) { next(error); }
});
export default router;
