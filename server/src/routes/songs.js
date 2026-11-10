import { Router } from "express";
import Song from "../models/Song.js";
const router = Router();
router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.q) filter.$or = ["title", "artist", "album"].map(key => ({ [key]: { $regex: req.query.q, $options: "i" } }));
    const songs = await Song.find(filter).sort({ createdAt: -1 }).limit(200).select("title artist album audioUrl coverUrl createdAt");
    res.json({ songs });
  } catch (error) { next(error); }
});
router.get("/:id", async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json({ song });
  } catch (error) { next(error); }
});
export default router;