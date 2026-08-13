#!/usr/bin/env bash
set -Eeuo pipefail

target_sha="${1:?Usage: deploy-production.sh <origin-main-sha>}"
app_dir="/app/myshop"
backup_dir="/home/neston/backups/myshop"

exec 9>/tmp/myshop-deploy.lock
if ! flock -n 9; then
  echo "Another myshop deployment is already running." >&2
  exit 1
fi

cd "$app_dir"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Production working tree is not clean; refusing to overwrite it." >&2
  git status --short >&2
  exit 1
fi

git fetch --prune origin main
remote_main="$(git rev-parse origin/main)"
if [[ "$target_sha" != "$remote_main" ]]; then
  echo "Requested commit is not the current origin/main; fetch locally and retry." >&2
  exit 1
fi

current_sha="$(git rev-parse HEAD)"
if [[ "$current_sha" == "$target_sha" ]]; then
  echo "Production is already at $target_sha."
  exit 0
fi

if ! git merge-base --is-ancestor "$current_sha" "$target_sha"; then
  echo "Deployment is not a fast-forward from production; refusing it." >&2
  exit 1
fi

mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
set -a
# shellcheck disable=SC1091
source .env
set +a
backup_database_url="$(DATABASE_URL="$DATABASE_URL" node -e 'const url = new URL(process.env.DATABASE_URL); url.searchParams.delete("schema"); process.stdout.write(url.toString())')"
pg_dump --format=custom --file="$backup_dir/myshop_db_${timestamp}_${current_sha:0:8}.dump" "$backup_database_url"

git merge --ff-only "$target_sha"
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy

pm2 restart myshop --update-env
pm2 save

for attempt in {1..30}; do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3010/ >/dev/null; then
    echo "Deployment successful: $current_sha -> $target_sha"
    echo "Database backup: $backup_dir/myshop_db_${timestamp}_${current_sha:0:8}.dump"
    exit 0
  fi
  sleep 2
done

echo "Deployment finished but the local health check failed. Inspect: pm2 logs myshop" >&2
exit 1

