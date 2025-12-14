# Bun + Express Service Template

Generic Express HTTP service template that runs on Bun with production-ready defaults (config validation, security headers, request logging, health checks, Docker, CI).

## Quickstart

- Install deps: `bun install`
- Build: `bun run build`
- Run: `bun run start`

## Endpoints

- `GET /` — service info + key endpoints
- `GET /api/health` — `{ status, uptime, timestamp }`
- `GET /api/health/ready` — `{ status, timestamp }`
- `GET /api/health/live` — `{ status, timestamp }`

## Request Contract (Non-health Endpoints)

- Required header: `x-correlation-id`
- Optional API key mode:
  - Set `API_KEY_SECRET` to enable
  - Then require `x-api-key` and `x-user-id` on non-health endpoints

## Environment Variables

Required (with defaults):

- `HOST` (default `0.0.0.0`)
- `PORT` (default `9000`)
- `NODE_ENV` (`development|production|test`, default `development`)
- `LOG_LEVEL` (`error|warn|info|debug`, default `info`)

Optional security/ops:

- `API_KEY_SECRET` (if set, require `x-api-key`)
- `CORS_ORIGINS` (default `*`; comma-separated list allowed)
- `RATE_LIMIT_WINDOW_MS` (default `300000`)
- `RATE_LIMIT_MAX_REQUESTS` (default `100`)

## Rate Limiting Notes

The default rate limiter is in-memory and intended for single-instance deployments. For multi-instance deployments, replace it with Redis or an external rate limiter.

## Customization Checklist

- Update `package.json` `name` + `version`
- Update `src/config/index.ts` `serviceInfo` (`name`, `version`, `message`)
- Logger service name comes from `src/config/index.ts` `serviceInfo.name`
- Update default port in `src/config/index.ts` and `.env.example`
- Update `Dockerfile` `EXPOSE` if you change the default port
- If you add a PID/lock file, update its name/path to match your service
