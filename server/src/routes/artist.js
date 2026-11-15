import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Song from "../models/Song.js";
import Album from "../models/Album.js";
import { protect } from "../middleware/auth.js";

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
const approvedArtist = (req, res, next) => {
  if (req.user?.role !== "artist" && req.user?.role !== "admin") return res.status(403).json({ message: "Your artist account must be approved before you can publish music." });
  next();
};

router.get("/me", protect, approvedArtist, async (req, res, next) => {
  try {
    const [songs, albums] = await Promise.all([
      Song.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 }),
      Album.find({ artist: req.user._id }).populate("songs", "title artist audioUrl coverUrl").sort({ createdAt: -1 })
    ]);
    res.json({ songs, albums, profile: { artistName: req.user.artistName || req.user.name, bio: req.user.artistBio || "" } });
  } catch (error) { next(error); }
});

router.put("/profile", protect, approvedArtist, async (req, res, next) => {
  try {
    req.user.artistName = String(req.body.artistName || req.user.name).trim().slice(0, 80);
    req.user.artistBio = String(req.body.bio || "").trim().slice(0, 1000);
    await req.user.save();
    res.json({ profile: { artistName: req.user.artistName, bio: req.user.artistBio } });
  } catch (error) { next(error); }
});

router.post("/songs", protect, approvedArtist, upload.fields([{ name: "audio", maxCount: 1 }, { name: "cover", maxCount: 1 }]), async (req, res, next) => {
  try {
    if (!req.files?.audio?.[0]) return res.status(400).json({ message: "An audio file is required" });
    if (!req.body.title?.trim()) return res.status(400).json({ message: "Song title is required" });
    const song = await Song.create({
      title: req.body.title.trim(), artist: req.user.artistName || req.user.name,
      album: String(req.body.album || "Single").trim(),
      audioUrl: "/uploads/" + req.files.audio[0].filename,
      coverUrl: req.files.cover?.[0] ? "/uploads/" + req.files.cover[0].filename : "",
      uploadedBy: req.user._id
    });
    res.status(201).json({ song });
  } catch (error) { next(error); }
});

router.post("/albums", protect, approvedArtist, async (req, res, next) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ message: "Album title is required" });
    const album = await Album.create({ title: req.body.title.trim(), description: String(req.body.description || "").slice(0, 1000), coverUrl: String(req.body.coverUrl || "").slice(0, 1000), artist: req.user._id });
    res.status(201).json({ album });
  } catch (error) { next(error); }
});

export default router;
