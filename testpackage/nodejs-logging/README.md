# Node.js Logging with Fluent Bit, Elasticsearch, and Kibana


- `node-app`: Node.js HTTP server ghi structured log JSON vao `/var/log/node-app/app.log`.
- `fluent-bit`: tail log file cua Node.js va push vao Elasticsearch.
- `elasticsearch`: single-node Elasticsearch cho local development.
- `kibana`: UI de xem va query log.

## Chay demo

```bash
docker compose up --build
```

Mo cac URL:

- Node app: <http://localhost:3005>
- Elasticsearch: <http://localhost:9205>
- Kibana: <http://localhost:5605>

Tao mot vai request de sinh log:

```bash
curl http://localhost:3005/
curl http://localhost:3005/health
curl http://localhost:3005/error
```

Trong Kibana, vao **Stack Management -> Data Views**, tao data view:

```text
nodejs-logs-*
```

Chon time field la `@timestamp`, sau do vao **Discover** de xem log.

## Dung demo

```bash
docker compose down
```

Xoa ca data Elasticsearch va log local:

```bash
docker compose down -v
rm -rf logs
```

