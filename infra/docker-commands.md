# 🐳 Docker Commands Cheat Sheet — AI Chat App

This cheat sheet covers the most common Docker commands you'll use to manage your **PostgreSQL** (and later Redis) services during development.

---

## 🟢 Start Database

Starts the PostgreSQL container defined in `infra/docker-compose.yml`.

```bash
cd infra
docker compose up -d
```

**✅ Explanation:**
- `up` → starts the services
- `-d` → runs in detached mode (background)
- PostgreSQL will start and persist data in `./postgres-data`

---

## 🔴 Stop Database

Gracefully stop and remove the running containers (without deleting data).

```bash
docker compose down
```

**✅ Explanation:**
- Stops all services defined in the compose file but keeps volumes and images intact

---

## 📜 View Logs

See real-time logs from the PostgreSQL container.

```bash
docker compose logs -f postgres
```

**✅ Explanation:**
- `-f` → follows logs (live updates)
- Replace `postgres` with `redis` later if you enable Redis

---

## 🧹 Reset Database (Delete Data Volume)

Removes containers and deletes persisted data to start fresh.

```bash
docker compose down -v
docker compose up -d
```

**✅ Explanation:**
- `-v` removes volumes (`./postgres-data`)
- Use this if migrations or schema changes require a clean slate

**⚠️ Warning:** This will permanently delete all data in your local database.

---

## 💻 Connect to PostgreSQL Shell (psql)

Open a psql interactive shell inside the running container.

```bash
docker exec -it ai-chat-postgres psql -U chatuser -d chatdb
```

**✅ Explanation:**
- `-it` makes the shell interactive
- `-U` specifies the username
- `-d` specifies the database name

You'll then be inside the PostgreSQL shell:

```sql
chatdb=# \dt
```

---

## 🩺 Check Database Health

Check if PostgreSQL container is healthy (based on Docker healthcheck).

```bash
docker inspect --format='{{json .State.Health}}' ai-chat-postgres | jq
```

**✅ Explanation:**
- Displays health status (`healthy`, `starting`, or `unhealthy`)
- Requires `jq` for nice formatting (optional)

**Alternatively:**

```bash
docker ps
```

Look under the `STATUS` column — it will show `healthy` when ready.

---

## 🧭 Helpful Shortcuts

| Action | Command |
|--------|---------|
| Restart DB | `docker compose restart postgres` |
| List containers | `docker ps` |
| List volumes | `docker volume ls` |
| Remove dangling images | `docker image prune` |
| Remove all stopped containers | `docker container prune` |

---

## 🧠 Tips

- Use `docker compose ps` to see running services and ports
- If you modify `docker-compose.yml`, always restart with `docker compose up -d --build`
- Add `--remove-orphans` when removing old services that no longer exist

---