```cp .env.example .env```

``` docker compose -f backend/docker-compose.yml up ```

```docker cp <container_id_or_name>:/usr/share/elasticsearch/config/certs/ca/ca.crt ./backend/ca.crt```