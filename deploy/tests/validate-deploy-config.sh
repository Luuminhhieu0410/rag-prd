#!/usr/bin/env bash
set -Eeuo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
compose_file="$repository_root/deploy/docker-compose.prod.yml"
rollout_script="$repository_root/deploy/scripts/deploy-backend.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT
touch "$fixture_dir/runtime.env"
mkdir "$fixture_dir/secrets"

bash -n "$rollout_script"
BACKEND_IMAGE=ghcr.io/example/rag-backend:test \
API_DOMAIN=api.example.com \
RUNTIME_ENV_FILE="$fixture_dir/runtime.env" \
SECRETS_DIR="$fixture_dir/secrets" \
  docker compose --file "$compose_file" config --quiet

rendered=$(BACKEND_IMAGE=ghcr.io/example/rag-backend:test \
  API_DOMAIN=api.example.com \
  RUNTIME_ENV_FILE="$fixture_dir/runtime.env" \
  SECRETS_DIR="$fixture_dir/secrets" \
  docker compose --file "$compose_file" config)

api_config=$(awk '
  /^  api:$/ { in_api = 1; next }
  /^  [[:alnum:]_-]+:$/ { in_api = 0 }
  in_api { print }
' <<<"$rendered")

grep -q 'published:' <<<"$api_config" && {
  echo 'API port must not be published on the EC2 host' >&2
  exit 1
}
grep -q 'target: /run/secrets' <<<"$rendered"
grep -q 'published: "443"' <<<"$rendered"
