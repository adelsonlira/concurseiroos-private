import type { Request, Response } from "express";
import app from "../src/server/httpApp";

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
