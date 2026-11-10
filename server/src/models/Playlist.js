import mongoose from "mongoose";
const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }]
}, { timestamps: true });
export default mongoose.model("Playlist", playlistSchema);