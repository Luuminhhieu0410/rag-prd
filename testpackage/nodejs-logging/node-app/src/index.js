import { createServer } from "node:http";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT || 3000);
const logFile = process.env.LOG_FILE || "/var/log/node-app/app.log";
const service = process.env.SERVICE_NAME || "nodejs-logging-demo";

mkdirSync(dirname(logFile), { recursive: true });

function writeLog(entry) {
  const payload = {
    time: new Date().toISOString(),
    service,
    ...entry,
  };

  const line = `${JSON.stringify(payload)}\n`;
  appendFileSync(logFile, line);
  process.stdout.write(line);
}

function sendJson(res, statusCode, body) {
  const responseBody = JSON.stringify(body);

  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(responseBody),
  });
  res.end(responseBody);
}

const server = createServer((req, res) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  const startedAt = process.hrtime.bigint();
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    writeLog({
      level: res.statusCode >= 500 ? "error" : "info",
      event: "http_request",
      request_id: requestId,
      method: req.method,
      path: url.pathname,
      status_code: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2)),
      user_agent: req.headers["user-agent"] || null,
      remote_address: req.socket.remoteAddress,
    });
  });

  if (url.pathname === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (url.pathname === "/error") {
    writeLog({
      level: "error",
      event: "demo_error",
      request_id: requestId,
      message: "Synthetic error for logging demo",
    });

    sendJson(res, 500, {
      request_id: requestId,
      error: "Synthetic error for logging demo",
    });
    return;
  }

  sendJson(res, 200, {
    service,
    request_id: requestId,
    message: "Node.js logging demo is running",
    routes: ["/", "/health", "/error"],
  });
});

server.listen(port, "0.0.0.0", () => {
  writeLog({
    level: "info",
    event: "server_started",
    message: `Listening on port ${port}`,
    port,
  });
});

