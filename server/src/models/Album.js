import mongoose from "mongoose";

const albumSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  coverUrl: { type: String, default: "" },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }]
}, { timestamps: true });

export default mongoose.model("Album", albumSchema);
