import { Router } from "express";
import Playlist from "../models/Playlist.js";
import Song from "../models/Song.js";
import { protect } from "../middleware/auth.js";
const router = Router();
router.get("/", protect, async (req, res, next) => {
  try {
    const paginationRequested = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = Playlist.find({ owner: req.user._id }).populate("songs", "title artist audioUrl coverUrl").sort({ createdAt: -1 });
    if (paginationRequested) query.skip((page - 1) * limit).limit(limit);
    const [playlists, total] = await Promise.all([query, paginationRequested ? Playlist.countDocuments({ owner: req.user._id }) : Promise.resolve(null)]);
    if (!paginationRequested) return res.json({ playlists });
    res.json({ playlists, pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total } });
  } catch (error) { next(error); }
});
router.post("/", protect, async (req, res, next) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ message: "Playlist name is required" });
    const playlist = await Playlist.create({ name: req.body.name.trim(), owner: req.user._id });
    res.status(201).json({ playlist });
  } catch (error) { next(error); }
});
router.post("/:id/songs", protect, async (req, res, next) => {
  try {
    const [playlist, song] = await Promise.all([Playlist.findOne({ _id: req.params.id, owner: req.user._id }), Song.findById(req.body.songId)]);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    if (!song) return res.status(404).json({ message: "Song not found" });
    if (!playlist.songs.some(id => id.equals(song._id))) playlist.songs.push(song._id);
    await playlist.save(); await playlist.populate("songs", "title artist audioUrl coverUrl");
    res.json({ playlist });
  } catch (error) { next(error); }
});
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const result = await Playlist.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!result) return res.status(404).json({ message: "Playlist not found" });
    res.json({ message: "Playlist deleted" });
  } catch (error) { next(error); }
});
export default router;