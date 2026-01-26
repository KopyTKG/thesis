import { join } from "path";

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle root path
    if (pathname === "/") {
      return new Response("Server is running! Try /index.html or /v1.html", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Remove leading slash and serve from zadani folder
    const filename = pathname.slice(1);
    const filepath = join(import.meta.dir, "zadani", filename);

    try {
      const file = Bun.file(filepath);

      // Check if file exists
      if (!(await file.exists())) {
        return new Response("File not found", { status: 404 });
      }

      // Serve the file with appropriate content type
      return new Response(file);
    } catch (error) {
      return new Response("Error reading file", { status: 500 });
    }
  },
});

console.log("Server running at http://localhost:3000");
console.log("Try: http://localhost:3000/index.html or http://localhost:3000/v1.html");
