import jwt from "jsonwebtoken";

// Verifies the "Authorization: Bearer <token>" header and sets req.user = { id, role }.
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const decoded = jwt.verify(token, req.app.locals.config.jwtSecret, { algorithms: ["HS256"] });
    req.user = { id: String(decoded.id), role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Allows the request only for the given roles. Use after authenticate.
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "You do not have permission to do this" });
    }
    return next();
  };

export default authenticate;
