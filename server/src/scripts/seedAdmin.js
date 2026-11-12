import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error("Configure MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD first."); process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
await User.findOneAndUpdate({ email }, { name: process.env.ADMIN_NAME || "Site Admin", email, password, role: "admin" }, { upsert: true, new: true, runValidators: true });
console.log("Administrator account ready for " + email);
await mongoose.disconnect();
