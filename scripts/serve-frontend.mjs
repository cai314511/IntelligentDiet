import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.FRONTEND_PORT || 8000);
const target = new URL(process.env.API_TARGET || "http://127.0.0.1:5000");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      const upstream = http.request(
        {
          hostname: target.hostname,
          port: target.port || 80,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: target.host },
        },
        (response) => {
          res.writeHead(response.statusCode, response.headers);
          response.pipe(res);
        },
      );
      upstream.on("error", () => {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "服务暂不可用，请稍后重试" }));
      });
      req.pipe(upstream);
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const parts = pathname.split("/").filter(Boolean),
      allowed = [
        "index.html",
        "portal.js",
        "config.js",
        "shared",
        "assets",
        "canteen",
        "management",
      ];
    if (
      (parts.length && !allowed.includes(parts[0])) ||
      parts.some((p) => p.startsWith(".") || p === "..")
    ) {
      res.writeHead(404);
      res.end();
      return;
    }
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (
        ![
          ".html",
          ".js",
          ".mjs",
          ".css",
          ".svg",
          ".png",
          ".jpg",
          ".json",
        ].includes(path.extname(file))
      )
        throw new Error();
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404);
      res.end("页面不存在");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `智饷共用入口 http://localhost:${port}；独立 API ${target.origin}`,
    ),
  );
