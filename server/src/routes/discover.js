import { Router } from "express";
import Song from "../models/Song.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const AUDIUS_API = "https://api.audius.co/v1";

function audiusUrl(path, params = {}) {
  const url = new URL(AUDIUS_API + path);
  url.searchParams.set("app_name", "Melody");
  if (process.env.AUDIUS_API_KEY) url.searchParams.set("api_key", process.env.AUDIUS_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

function normalizeTrack(track) {
  return {
    id: String(track.id),
    title: track.title || "Untitled track",
    artist: track.user?.name || track.artist || "Unknown artist",
    album: track.album?.playlist_name || "Audius",
    artwork: track.artwork?.["480x480"] || track.artwork?.["150x150"] || track.artwork?.["1000x1000"] || "",
    duration: track.duration || 0,
    permalink: track.permalink ? `https://audius.co${track.permalink}` : "https://audius.co",
    isStreamable: track.is_streamable !== false
  };
}

async function audiusGet(path, params) {
  const response = await fetch(audiusUrl(path, params), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Audius returned ${response.status}`);
  const payload = await response.json();
  if (payload?.data === undefined) throw new Error("Audius returned an unexpected response");
  return payload.data;
}

router.get("/search", async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim().slice(0, 100);
    if (!query) return res.status(400).json({ message: "Enter a track or artist to search" });
    const tracks = await audiusGet("/tracks/search", { query, limit: 24 });
    res.json({ tracks: tracks.filter(track => track.is_streamable !== false).map(normalizeTrack) });
  } catch (error) { next(error); }
});

router.get("/trending", async (_req, res, next) => {
  try {
    const tracks = await audiusGet("/tracks/trending", { limit: 24, time: "week" });
    res.json({ tracks: tracks.filter(track => track.is_streamable !== false).map(normalizeTrack) });
  } catch (error) { next(error); }
});

router.get("/:trackId/stream", async (req, res, next) => {
  try {
    if (!/^[a-zA-Z0-9_-]{5,100}$/.test(req.params.trackId)) return res.status(400).json({ message: "Invalid Audius track ID" });
    const url = audiusUrl(`/tracks/${encodeURIComponent(req.params.trackId)}/stream`);
    res.redirect(302, url.toString());
  } catch (error) { next(error); }
});

router.post("/import", protect, async (req, res, next) => {
  try {
    const { id, title, artist, artwork, permalink } = req.body || {};
    if (!id || !/^[a-zA-Z0-9_-]{5,100}$/.test(String(id)) || !String(title || "").trim()) {
      return res.status(400).json({ message: "A valid Audius track is required" });
    }
    let song = await Song.findOne({ provider: "audius", providerId: String(id) });
    if (!song) {
      song = await Song.create({
        title: String(title).trim().slice(0, 120),
        artist: String(artist || "Unknown artist").trim().slice(0, 120),
        album: "Audius",
        audioUrl: `/api/discover/${encodeURIComponent(id)}/stream`,
        coverUrl: typeof artwork === "string" ? artwork.slice(0, 1000) : "",
        provider: "audius",
        providerId: String(id),
        sourceUrl: typeof permalink === "string" ? permalink.slice(0, 1000) : "https://audius.co"
      });
    }
    res.status(200).json({ song, message: "Added to your Melody library" });
  } catch (error) { next(error); }
});

export default router;
