import { Router } from "express";
import User from "../models/User.js";
import Song from "../models/Song.js";
import { protect } from "../middleware/auth.js";
const router = Router();
router.get("/liked", protect, async (req, res, next) => {
  try { const user = await User.findById(req.user._id).populate("likedSongs", "title artist album audioUrl coverUrl"); res.json({ songs: user.likedSongs }); }
  catch (error) { next(error); }
});
router.post("/liked/:songId", protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.songId);
    if (!song) return res.status(404).json({ message: "Song not found" });
    const alreadyLiked = req.user.likedSongs.some(id => id.equals(song._id));
    if (alreadyLiked) req.user.likedSongs.pull(song._id); else req.user.likedSongs.push(song._id);
    await req.user.save();
    res.json({ liked: !alreadyLiked });
  } catch (error) { next(error); }
});
export default router;