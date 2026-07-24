#!/usr/bin/env bash
set -Eeuo pipefail

deploy_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
compose_file="$deploy_dir/docker-compose.prod.yml"
runtime_env_file="$deploy_dir/.env.production"
lock_file="$deploy_dir/.deploy.lock"

: "${BACKEND_IMAGE:?BACKEND_IMAGE is required}"
: "${API_DOMAIN:?API_DOMAIN is required}"
[[ "$API_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || {
  echo 'API_DOMAIN contains invalid characters' >&2
  exit 1
}
[[ -f "$runtime_env_file" ]] || {
  echo "$runtime_env_file is missing" >&2
  exit 1
}
mkdir -p "$deploy_dir/secrets"

exec 9>"$lock_file"
flock -n 9 || {
  echo 'Another backend deployment is already running' >&2
  exit 1
}

export BACKEND_IMAGE API_DOMAIN
export RUNTIME_ENV_FILE="$runtime_env_file"
export SECRETS_DIR="$deploy_dir/secrets"

compose() {
  docker compose --env-file "$runtime_env_file" --file "$compose_file" "$@"
}

api_container_id() {
  compose ps --quiet api
}

wait_for_api_health() {
  local container_id status
  for _ in $(seq 1 45); do
    container_id=$(api_container_id)
    if [[ -n "$container_id" ]]; then
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
      [[ "$status" == 'healthy' ]] && return 0
      [[ "$status" == 'unhealthy' || "$status" == 'exited' || "$status" == 'dead' ]] && return 1
    fi
    sleep 2
  done
  return 1
}

wait_for_public_health() {
  local response
  for _ in $(seq 1 36); do
    if response=$(curl --fail --silent --show-error --max-time 10 "https://$API_DOMAIN/"); then
      if grep -Eq '"success"[[:space:]]*:[[:space:]]*true.*"status"[[:space:]]*:[[:space:]]*"ok"' <<<"$response"; then
        return 0
      fi
    fi
    sleep 5
  done
  return 1
}

previous_image=''
current_container=$(api_container_id)
if [[ -n "$current_container" ]]; then
  previous_image=$(docker inspect --format '{{.Config.Image}}' "$current_container")
fi

rollback() {
  compose logs --tail=100 api caddy >&2 || true
  if [[ -z "$previous_image" ]]; then
    echo 'No previous API image is available for rollback' >&2
    return 1
  fi

  echo "Rolling back API to $previous_image" >&2
  export BACKEND_IMAGE="$previous_image"
  compose up --detach --no-deps api
  wait_for_api_health
  compose up --detach caddy
  wait_for_public_health
}

compose config --quiet
compose up --detach --wait postgres redis elasticsearch
compose pull api
compose run --rm --no-deps api yarn prisma migrate deploy --config prisma.config.ts
compose up --detach --no-deps api

if ! wait_for_api_health; then
  echo 'New API container failed its health check' >&2
  if ! rollback; then
    echo 'Automatic API rollback also failed' >&2
  fi
  exit 1
fi

compose up --detach caddy
if ! wait_for_public_health; then
  echo 'Public API health check failed' >&2
  if ! rollback; then
    echo 'Automatic API rollback also failed' >&2
  fi
  exit 1
fi

compose ps
echo "Backend deployment succeeded: $BACKEND_IMAGE"
