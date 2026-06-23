# ============================================
# FamilyOS Backend — Dockerfile
# ============================================

# STEP 1: Use Node.js 20 on Debian (not Alpine) for native module support
FROM node:20-slim

# STEP 2: Install build tools needed for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# STEP 3: Set working directory
WORKDIR /app

# STEP 4: Copy package files first (for Docker layer caching)
COPY package*.json ./

# STEP 5: Install dependencies
RUN npm install --omit=dev

# STEP 6: Copy source code
COPY . .

# STEP 7: Expose port
EXPOSE 3001

# STEP 8: Environment defaults
ENV NODE_ENV=production
ENV PORT=3001

# STEP 9: Volume for SQLite fallback
VOLUME ["/app/data"]

# STEP 10: Start the app
CMD ["node", "src/server.js"]
