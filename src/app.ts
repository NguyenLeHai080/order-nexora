import express, { type Express, type Request, type Response } from 'express';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  // Health check — dùng cho readiness/liveness probe và CI smoke test.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'order-nexora' });
  });

  return app;
}
