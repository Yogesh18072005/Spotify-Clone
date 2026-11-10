import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
const router = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });
const makeToken = user => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role });
router.post("/register", authLimit, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) return res.status(400).json({ message: "Name, email and a password of at least 8 characters are required" });
    if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(409).json({ message: "An account with this email already exists" });
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.post("/login", authLimit, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase().trim() }).select("+password");
    if (!user || !await bcrypt.compare(req.body.password || "", user.password)) return res.status(401).json({ message: "Invalid email or password" });
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.get("/me", protect, (req, res) => res.json({ user: publicUser(req.user) }));
export default router;