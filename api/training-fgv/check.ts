import type { Request, Response } from "express";
import app from "../../src/server/httpApp.js";
import { validateFgvTrainingServerCatalog } from "../../src/server/training/fgvTrainingServer.js";

// Static validation keeps the private correction catalog in the serverless bundle
// and fails closed during cold start if the public/private catalogs diverge.
validateFgvTrainingServerCatalog();

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
