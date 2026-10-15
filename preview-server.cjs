// Dependency-free local preview: node kick-and-count/preview-server.cjs
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".jpg": "image/jpeg", ".ttf": "font/ttf" };
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
  fs.stat(file, (error, stat) => {
    if (error) {
      response.writeHead(404).end("Not found");
      return;
    }
    const headers = { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Accept-Ranges": "bytes" };
    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match && match[1] ? Number(match[1]) : match && match[2] ? Math.max(0, stat.size - Number(match[2])) : 0;
      const end = match && match[1] && match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (!match || start > end || start >= stat.size) {
        response.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
        return;
      }
      response.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(response);
    } else {
      response.writeHead(200, { ...headers, "Content-Length": stat.size });
      fs.createReadStream(file).pipe(response);
    }
  });
}).listen(4173, "127.0.0.1", () => console.log("Menu preview: http://127.0.0.1:4173"));