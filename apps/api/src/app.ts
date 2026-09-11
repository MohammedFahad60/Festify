import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import crypto from "node:crypto";
import routes from "./routes/index.js";
import { env } from "./config/env.js";

export type ApiError = Error & { status?: number; code?: string; details?: unknown };

export const success = (data: unknown, message?: string) => ({ success: true, data, ...(message ? { message } : {}) });
export const failure = (code: string, message: string, details?: unknown) => ({ success: false, error: { code, message, ...(details === undefined ? {} : { details }) } });

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin.split(",").map((v) => v.trim()), credentials: true }));
  app.use((req, res, next) => {
    const id = req.header("x-request-id") || crypto.randomUUID();
    res.setHeader("x-request-id", id);
    (req as Request & { requestId?: string }).requestId = id;
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    const started = Date.now();
    _res.once("finish", () => console.info(JSON.stringify({ requestId: (req as Request & { requestId?: string }).requestId, method: req.method, path: req.originalUrl, status: _res.statusCode, durationMs: Date.now() - started })));
    next();
  });

  const mount = (prefix: string) => {
    app.use(prefix, routes);
  };
  mount("/api/v1");
  // Kept as a compatibility alias for existing clients during the v1 migration.
  mount("/api");
  app.get("/health", (_req, res) => res.json(success({ api: "ok", version: "v1", timestamp: new Date().toISOString() })));

  app.use((_req, res) => res.status(404).json(failure("NOT_FOUND", "Resource not found")));
  app.use((error: ApiError, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    const status = error.status ?? 500;
    res.status(status).json(failure(error.code ?? "INTERNAL_ERROR", status === 500 ? "Internal server error" : error.message, error.details));
  });
  return app;
}

const app = createApp();
export default app;
