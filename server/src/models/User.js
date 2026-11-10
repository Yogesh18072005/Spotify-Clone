import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }]
}, { timestamps: true });
export default mongoose.model("User", userSchema);