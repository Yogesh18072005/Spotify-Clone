import { Router } from "express";
import Song from "../models/Song.js";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.q) {
      const term = String(req.query.q).trim().slice(0, 100);
      filter.$or = ["title", "artist", "album"].map(key => ({ [key]: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }));
    }
    const paginationRequested = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const query = Song.find(filter).sort({ createdAt: -1 }).select("title artist album audioUrl coverUrl createdAt provider providerId sourceUrl");
    if (paginationRequested) query.skip((page - 1) * limit).limit(limit);
    else query.limit(200);
    const [songs, total] = await Promise.all([query, paginationRequested ? Song.countDocuments(filter) : Promise.resolve(null)]);
    if (!paginationRequested) return res.json({ songs });
    res.json({ songs, pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total } });
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
