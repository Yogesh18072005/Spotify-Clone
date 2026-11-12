import { Router } from "express";
import Album from "../models/Album.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const albums = await Album.find().populate("artist", "name artistName").populate("songs", "title artist audioUrl coverUrl").sort({ createdAt: -1 }).limit(100);
    res.json({ albums });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id).populate("artist", "name artistName").populate("songs", "title artist album audioUrl coverUrl provider sourceUrl");
    if (!album) return res.status(404).json({ message: "Album not found" });
    res.json({ album });
  } catch (error) { next(error); }
});

router.post("/", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "artist" && req.user.role !== "admin") return res.status(403).json({ message: "An approved artist account is required to create albums" });
    if (!req.body.title?.trim()) return res.status(400).json({ message: "Album title is required" });
    const album = await Album.create({ title: req.body.title.trim(), description: String(req.body.description || "").slice(0, 1000), coverUrl: String(req.body.coverUrl || "").slice(0, 1000), artist: req.user._id });
    res.status(201).json({ album });
  } catch (error) { next(error); }
});

router.post("/:id/songs", protect, async (req, res, next) => {
  try {
    const album = await Album.findOne({ _id: req.params.id, artist: req.user._id });
    if (!album) return res.status(404).json({ message: "Album not found or you do not own it" });
    const Song = (await import("../models/Song.js")).default;
    const song = await Song.findOne({ _id: req.body.songId, uploadedBy: req.user._id });
    if (!song) return res.status(404).json({ message: "Your uploaded song was not found" });
    if (!album.songs.some(id => id.equals(song._id))) album.songs.push(song._id);
    await album.save();
    await album.populate("songs", "title artist audioUrl coverUrl");
    res.json({ album });
  } catch (error) { next(error); }
});

router.post("/:id/save", protect, async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: "Album not found" });
    const user = await User.findById(req.user._id);
    const exists = user.savedAlbums.some(id => id.equals(album._id));
    if (exists) user.savedAlbums.pull(album._id); else user.savedAlbums.push(album._id);
    await user.save();
    res.json({ saved: !exists });
  } catch (error) { next(error); }
});

router.get("/saved", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({ path: "savedAlbums", populate: [{ path: "artist", select: "name artistName" }, { path: "songs", select: "title artist audioUrl coverUrl" }] });
    res.json({ albums: user.savedAlbums });
  } catch (error) { next(error); }
});

export default router;
