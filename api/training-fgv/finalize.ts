import type { Request, Response } from "express";
import app from "../../src/server/httpApp.js";
import { validateFgvTrainingServerCatalog } from "../../src/server/training/fgvTrainingServer.js";

validateFgvTrainingServerCatalog();

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
