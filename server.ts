import express from "express";
import path from "path";
import app from "./src/server/httpApp";

const PORT = Number(process.env.PORT || 3000);

async function startLocalServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const publicPath = path.join(process.cwd(), "public");
    app.use(express.static(publicPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ConcurseiroOS] Backend server listening on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  void startLocalServer();
}

export default app;
