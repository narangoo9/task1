import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ prefix: 'taskflow_' });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'taskflow_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'taskflow_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const wsConnectionsGauge = new promClient.Gauge({
  name: 'taskflow_websocket_connections',
  help: 'Current number of WebSocket connections',
});

export const dbQueryDuration = new promClient.Histogram({
  name: 'taskflow_db_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['operation'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

export const activeUsersGauge = new promClient.Gauge({
  name: 'taskflow_active_users',
  help: 'Number of active users (last 5 min)',
});

// Middleware to record request metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const route = req.route?.path ?? req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    const duration = Date.now() - start;
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
}

// Expose metrics endpoint
export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
}
