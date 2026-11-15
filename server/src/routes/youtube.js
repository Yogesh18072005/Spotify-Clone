import { Router } from "express";
import rateLimit from "express-rate-limit";

const router = Router();
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many YouTube searches. Please wait a little and try again." }
});
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

router.get("/search", searchLimiter, async (req, res, next) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "YouTube search is not configured yet. Add YOUTUBE_API_KEY to the server .env file and restart Melody." });
    }

    const query = String(req.query.q || "").trim().slice(0, 100);
    if (!query) return res.status(400).json({ message: "Enter a song, artist or genre to search." });

    const cacheKey = query.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return res.json({ videos: cached.videos, cached: true });

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
      key: apiKey,
      part: "snippet",
      type: "video",
      q: query,
      maxResults: "12",
      regionCode: "IN",
      relevanceLanguage: "hi",
      safeSearch: "moderate",
      videoEmbeddable: "true",
      fields: "items(id/videoId,snippet(title,channelTitle,publishedAt,thumbnails(medium/url,high/url)))"
    }).toString();

    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    const payload = await response.json();
    if (!response.ok) {
      const reason = payload?.error?.errors?.[0]?.reason;
      if (response.status === 403 && reason === "quotaExceeded") {
        return res.status(429).json({ message: "YouTube search's free daily quota has been used. Try again after the quota resets." });
      }
      return res.status(response.status === 403 ? 502 : response.status).json({ message: payload?.error?.message || "YouTube search failed." });
    }

    const videos = (payload.items || []).filter(item => item.id?.videoId).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet?.title || "Untitled video",
      channelTitle: item.snippet?.channelTitle || "YouTube creator",
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
      publishedAt: item.snippet?.publishedAt || null
    }));
    cache.set(cacheKey, { videos, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json({ videos, cached: false });
  } catch (error) {
    next(error);
  }
});

export default router;
