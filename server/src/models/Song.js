import mongoose from "mongoose";
const songSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  artist: { type: String, trim: true, default: "Unknown artist" },
  album: { type: String, trim: true, default: "Single" },
  audioUrl: { type: String, required: true },
  coverUrl: { type: String, default: "" },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
export default mongoose.model("Song", songSchema);