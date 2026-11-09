# syntax=docker/dockerfile:1
# ResideFix API — production image
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies, exactly as pinned in the lockfile.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Folder for the auto-generated JWT secret (mounted as a named volume).
RUN mkdir -p /app/data && chown node:node /app/data

# Run as the unprivileged "node" user that ships with the image.
USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start node directly (not via npm) so it receives SIGTERM for graceful shutdown.
CMD ["node", "src/server.js"]
