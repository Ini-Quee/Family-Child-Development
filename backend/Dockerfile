# ============================================
# FamilyOS Backend — Dockerfile
# ============================================
# This file tells Docker how to build your backend app.
# Think of it as a recipe: "Here's what I need, here's how to cook it."

# STEP 1: Start from a base image.
# node:20-alpine = Node.js version 20, lightweight (alpine = small Linux).
# "alpine" means ~50MB instead of ~300MB. Faster to download, cheaper to run.
FROM node:20-alpine

# STEP 2: Set the working directory inside the container.
# All future commands run from /app. Like doing "cd /app"
WORKDIR /app

# STEP 3: Copy package.json and package-lock.json FIRST.
# Why first? Docker caches layers. If you change code but not dependencies,
# Docker skips "npm install" and uses the cached version. Saves time.
COPY package*.json ./

# STEP 4: Install dependencies.
# --omit=dev = don't install devDependencies (like nodemon) in production.
# Keeps the image smaller and more secure.
RUN npm install --omit=dev

# STEP 5: Copy the rest of your source code.
# This happens AFTER npm install so code changes don't trigger a reinstall.
COPY . .

# STEP 6: Expose port 3001.
# This tells Docker "this app listens on port 3001".
# It's documentation — doesn't actually open the port.
EXPOSE 3001

# STEP 7: Define environment variables with defaults.
# These can be overridden at runtime via docker-compose.yml or "docker run -e"
ENV NODE_ENV=production
ENV PORT=3001

# STEP 8: Create a volume mount point for the SQLite database.
# Volumes persist data even when the container is destroyed.
# Without this, your database would disappear every time you restart.
VOLUME ["/app/data"]

# STEP 9: The command to run when the container starts.
# Like typing "node src/server.js" in your terminal.
CMD ["node", "src/server.js"]
