#!/usr/bin/env bash
set -Eeuo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
compose_file="$repository_root/deploy/docker-compose.prod.yml"
rollout_script="$repository_root/deploy/scripts/deploy-backend.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT
cat >"$fixture_dir/runtime.env" <<'EOF'
DATABASE_URL=postgresql://rag:rag-test@postgres:5432/rag
POSTGRES_USER=rag
POSTGRES_PASSWORD=rag-test
POSTGRES_DB=rag
REDIS_PASSWORD=redis-test
ELASTIC_PASSWORD=elastic-test
STACK_VERSION=8.17.0
EOF
mkdir "$fixture_dir/secrets"

bash -n "$rollout_script"
BACKEND_IMAGE=ghcr.io/example/rag-backend:test \
API_DOMAIN=api.example.com \
RUNTIME_ENV_FILE="$fixture_dir/runtime.env" \
SECRETS_DIR="$fixture_dir/secrets" \
  docker compose --env-file "$fixture_dir/runtime.env" --file "$compose_file" config --quiet

rendered=$(BACKEND_IMAGE=ghcr.io/example/rag-backend:test \
  API_DOMAIN=api.example.com \
  RUNTIME_ENV_FILE="$fixture_dir/runtime.env" \
  SECRETS_DIR="$fixture_dir/secrets" \
  docker compose --env-file "$fixture_dir/runtime.env" --file "$compose_file" config)

service_config() {
  local service=$1
  awk -v service="$service" '
    $0 == "  " service ":" { in_service = 1; next }
    /^  [[:alnum:]_-]+:$/ { in_service = 0 }
    in_service { print }
  ' <<<"$rendered"
}

api_config=$(service_config api)
grep -q 'published:' <<<"$api_config" && {
  echo 'API port must not be published on the EC2 host' >&2
  exit 1
}
grep -q 'target: /run/secrets' <<<"$rendered"
grep -q 'published: "443"' <<<"$rendered"

for service in postgres redis elasticsearch; do
  config=$(service_config "$service")
  [[ -n "$config" ]] || {
    echo "$service service is missing" >&2
    exit 1
  }
  grep -q 'healthcheck:' <<<"$config"
  if grep -q 'published:' <<<"$config"; then
    echo "$service port must not be published on the EC2 host" >&2
    exit 1
  fi
done

grep -q 'source: postgres_data' <<<"$(service_config postgres)"
grep -q 'target: /var/lib/postgresql/data' <<<"$(service_config postgres)"
grep -q 'source: redis_data' <<<"$(service_config redis)"
grep -q 'target: /data' <<<"$(service_config redis)"
grep -q 'source: elasticsearch_data' <<<"$(service_config elasticsearch)"
grep -q 'target: /usr/share/elasticsearch/data' <<<"$(service_config elasticsearch)"

grep -q 'DATABASE_URL: postgresql://rag:rag-test@postgres:5432/rag' <<<"$api_config"
grep -q 'REDIS_HOST: redis' <<<"$api_config"
grep -q 'REDIS_PORT: "6379"' <<<"$api_config"
grep -q 'ELASTIC_HOST: http://elasticsearch:9200' <<<"$api_config"
grep -q 'ELASTIC_USER: elastic' <<<"$api_config"

grep -Fq 'docker compose --env-file "$runtime_env_file" --file "$compose_file"' "$rollout_script"
grep -Fq 'compose up --detach --wait postgres redis elasticsearch' "$rollout_script"
grep -Fq 'compose up --detach --no-deps api' "$rollout_script"

dependency_start_line=$(grep -Fn 'compose up --detach --wait postgres redis elasticsearch' "$rollout_script" | cut -d: -f1)
migration_line=$(grep -Fn 'yarn prisma migrate deploy' "$rollout_script" | cut -d: -f1)
if ((dependency_start_line >= migration_line)); then
  echo 'Dependencies must be healthy before Prisma migrations run' >&2
  exit 1
fi
