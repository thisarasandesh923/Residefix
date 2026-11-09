import logger from "../utils/logger.js";

export function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

// Central error handler: known errors become clean 4xx responses; anything else
// is logged on the server and reported to the client without a stack trace.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid value in request" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "That record already exists" });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }

  logger.error(`${req.method} ${req.originalUrl} failed:`, err);
  return res.status(500).json({ message: "Something went wrong on the server" });
}
