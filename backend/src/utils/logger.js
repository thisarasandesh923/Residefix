import process from "node:process";

// Minimal timestamped logger. Output goes to stdout/stderr so `docker compose logs`
// shows it. Never pass passwords, tokens or connection strings with credentials.
const silent = process.env.NODE_ENV === "test";

const write = (stream, level, args) => {
  if (silent) return;
  stream(`${new Date().toISOString()} [${level}]`, ...args);
};

const logger = {
  info: (...args) => write(console.log, "info", args),
  warn: (...args) => write(console.warn, "warn", args),
  error: (...args) => write(console.error, "error", args),
};

export default logger;
