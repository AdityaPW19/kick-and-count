// Dependency-free local preview: node kick-and-count/preview-server.cjs
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }
  const file = path.resolve(__dirname, `.${pathname}${pathname.endsWith("/") ? "index.html" : ""}`);
  if (!file.startsWith(`${__dirname}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    response.end(data);
  });
}).listen(4173, "127.0.0.1", () => console.log("Menu preview: http://127.0.0.1:4173"));