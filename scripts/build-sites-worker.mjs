import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const staticRoot = "dist";
const ignoredDirectories = new Set([".openai", "server"]);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const files = {};
const collectFiles = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await collectFiles(join(directory, entry.name));
      }
      continue;
    }
    const path = join(directory, entry.name);
    const route = "/" + relative(staticRoot, path).replaceAll("\\", "/");
    files[route] = {
      contentType: contentTypes[extname(entry.name)] ?? "application/octet-stream",
      body: (await readFile(path)).toString("base64"),
    };
  }
};

await collectFiles(staticRoot);
await mkdir("dist/server", { recursive: true });
await writeFile(
  "dist/server/index.js",
  "const files = " + JSON.stringify(files) + ";\n" +
    "const decode = (body) => Uint8Array.from(atob(body), (character) => character.charCodeAt(0));\n" +
    "export default { fetch(request) { const path = new URL(request.url).pathname; const file = files[path] ?? files['/index.html']; if (!file) return new Response('Not found', { status: 404 }); return new Response(decode(file.body), { headers: { 'content-type': file.contentType } }); } };\n",
);
