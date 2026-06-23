# FamilyOS — Docker Guide

## What is Docker?

Docker lets you run your app in a **container** — a lightweight, isolated environment that includes everything your app needs: the code, runtime, libraries, and settings. Think of it as a shipping container for software.

**Why use Docker?**
- "It works on my machine" → It works everywhere
- One command starts your entire stack (backend + database + cache)
- No conflicts between projects (each container is isolated)
- Easy to deploy to any server

---

## Prerequisites

Install Docker Desktop:
- **Windows:** https://docs.docker.com/desktop/install/windows-install/
- **Mac:** https://docs.docker.com/desktop/install/mac-install/
- **Linux:** https://docs.docker.com/engine/install/

After installing, verify:
```bash
docker --version        # Should show "Docker version 24.x.x"
docker compose version  # Should show "Docker Compose version v2.x.x"
```

---

## Quick Start (3 Commands)

```bash
# 1. Clone the repo
git clone https://github.com/Ini-Quee/Family-Child-Development.git
cd Family-Child-Development

# 2. Create your .env file
cp .env.example .env
# Edit .env with your passwords

# 3. Start everything
docker compose up
```

That's it. Your backend, PostgreSQL database, and Redis cache are all running.

---

## What's Running?

When you run `docker compose up`, Docker starts 3 containers:

| Container | What it does | Port |
|-----------|-------------|------|
| `familyos-api` | Your Node.js backend | 3001 |
| `familyos-db` | PostgreSQL database | 5432 |
| `familyos-redis` | Redis cache | 6379 |

They talk to each other using container names as hostnames:
- Backend connects to database at `postgres:5432` (not localhost!)
- Backend connects to Redis at `redis:6379`

---

## Docker Commands You'll Use

### Starting and Stopping

```bash
# Start everything (in the background)
docker compose up -d

# Start everything (see logs in terminal)
docker compose up

# Stop everything
docker compose down

# Stop everything AND delete all data
docker compose down -v
```

### Viewing Logs

```bash
# See all logs
docker compose logs

# Follow logs in real-time (like tail -f)
docker compose logs -f

# See only backend logs
docker compose logs backend

# See only database logs
docker compose logs postgres
```

### Checking Status

```bash
# See what's running
docker compose ps

# See resource usage (CPU, memory)
docker stats
```

### Rebuilding After Code Changes

```bash
# If you changed backend code
docker compose up --build backend

# If you changed docker-compose.yml
docker compose up --build
```

### Accessing Containers

```bash
# Open a shell inside the backend container
docker compose exec backend sh

# Open a PostgreSQL shell
docker compose exec postgres psql -U familyos

# Open a Redis shell
docker compose exec redis rediscli
```

---

## File Structure (Docker Files)

```
familyos/
├── docker-compose.yml          # Defines all services
├── .env                        # Your secrets (NOT in git)
├── .env.example                # Template for .env
├── backend/
│   ├── Dockerfile              # How to build the backend image
│   ├── .dockerignore           # Files to exclude from the image
│   └── src/
│       └── db/
│           └── init.sql        # Auto-runs when PostgreSQL starts
└── ...
```

---

## How Data Persists

Docker containers are **ephemeral** — they can be destroyed and recreated. But your data persists in **volumes**:

```yaml
# In docker-compose.yml:
volumes:
  postgres_data:    # Database files survive container restarts
  redis_data:       # Cache data survives container restarts
```

To see your volumes:
```bash
docker volume ls
```

To delete all data and start fresh:
```bash
docker compose down -v    # The -v flag deletes volumes
docker compose up
```

---

## Common Scenarios

### "I changed some backend code"

```bash
# Rebuild and restart just the backend
docker compose up --build backend
```

### "I changed docker-compose.yml"

```bash
# Rebuild everything
docker compose up --build
```

### "I want to see the database data"

```bash
# Open PostgreSQL shell
docker compose exec postgres psql -U familyos

# Then run SQL:
SELECT * FROM children;
SELECT * FROM wallets;
\q    # to quit
```

### "I want to start completely fresh"

```bash
docker compose down -v      # Stop and delete all data
docker compose up --build   # Rebuild and start
```

### "Port 3001 is already in use"

```bash
# Find what's using the port
netstat -ano | findstr :3001

# Kill it, or change the port in docker-compose.yml:
ports:
  - "3002:3001"  # Use 3002 on your machine
```

---

## Production Deployment

For production, change these in your `.env`:

```bash
DB_PASSWORD=a_very_strong_password_here
JWT_SECRET=a_random_64_character_string_here
```

Then deploy to any server with Docker:
```bash
# On your server:
git clone <your-repo>
cd Family-Child-Development
cp .env.example .env
# Edit .env with production secrets
docker compose up -d
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to Docker daemon" | Start Docker Desktop |
| "port is already allocated" | Change port in docker-compose.yml or kill the process |
| "database system is starting up" | Wait 10 seconds, PostgreSQL takes a moment |
| "relation does not exist" | Tables not created yet — check init.sql ran |
| Container keeps restarting | Check logs: `docker compose logs backend` |

---

## Next Steps

Once Docker is running:
1. The API is at `http://localhost:3001`
2. Health check: `http://localhost:3001/api/health`
3. Use the Expo app to connect to `http://localhost:3001`
