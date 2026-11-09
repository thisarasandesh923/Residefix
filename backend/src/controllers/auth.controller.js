import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { toPublicUser } from "../models/User.js";
import { validateLogin, validateSignup } from "../validators/index.js";

const BCRYPT_ROUNDS = 10;

// POST /api/auth/signup
export async function signup(req, res) {
  const { data, error } = validateSignup(req.body);
  if (error) return res.status(400).json({ message: error });

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const user = await User.create({
    ...data,
    password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
  });

  return res.status(201).json({
    message: "Account created successfully",
    user: toPublicUser(user),
  });
}

// POST /api/auth/login
export async function login(req, res) {
  const { data, error } = validateLogin(req.body);
  if (error) return res.status(400).json({ message: error });

  const user = await User.findOne({ email: data.email });
  const match = user ? await bcrypt.compare(data.password, user.password) : false;
  if (!match) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const { jwtSecret, jwtExpiresIn } = req.app.locals.config;
  const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, {
    algorithm: "HS256",
    expiresIn: jwtExpiresIn,
  });

  return res.json({ message: "Login successful", token, user: toPublicUser(user) });
}

// GET /api/auth/me — the logged-in user's profile (used to validate a stored session).
export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: "Account no longer exists" });
  return res.json({ user: toPublicUser(user) });
}
