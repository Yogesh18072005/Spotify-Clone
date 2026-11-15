import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "artist_pending", "artist", "admin"], default: "user" },
  likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
  savedAlbums: [{ type: mongoose.Schema.Types.ObjectId, ref: "Album" }],
  artistName: { type: String, trim: true, maxlength: 80, default: "" },
  artistBio: { type: String, trim: true, maxlength: 1000, default: "" },
  artistApplicationNote: { type: String, trim: true, maxlength: 1000, default: "" }
}, { timestamps: true });
export default mongoose.model("User", userSchema);