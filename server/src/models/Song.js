import mongoose from "mongoose";
const songSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  artist: { type: String, trim: true, default: "Unknown artist" },
  album: { type: String, trim: true, default: "Single" },
  audioUrl: { type: String, required: true },
  coverUrl: { type: String, default: "" },
  provider: { type: String, enum: ["local", "audius"], default: "local" },
  providerId: { type: String, default: "" },
  sourceUrl: { type: String, default: "" },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
songSchema.index({ provider: 1, providerId: 1 }, { unique: true, partialFilterExpression: { provider: "audius" } });
export default mongoose.model("Song", songSchema);
