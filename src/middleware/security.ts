import { timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import type { Config } from '../config';
import { sendError } from './errorHandler';

function isHealthPath(path: string): boolean {
	return path === '/api/health' || path.startsWith('/api/health/');
}

function safeStringEquals(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function createSecurityMiddleware(config: Config): RequestHandler[] {
	const windowMs = config.rateLimitWindowMs;
	const maxRequests = config.rateLimitMaxRequests;

	type RateLimitEntry = { count: number; resetAtMs: number };
	const rateLimits = new Map<string, RateLimitEntry>();
	let lastCleanupAtMs = Date.now();

	const cleanup = () => {
		const now = Date.now();
		if (now - lastCleanupAtMs < windowMs) return;
		lastCleanupAtMs = now;

		for (const [key, entry] of rateLimits.entries()) {
			if (entry.resetAtMs <= now) rateLimits.delete(key);
		}
	};

	const headerValidator: RequestHandler = (req, res, next) => {
		if (req.method === 'OPTIONS') return next();
		if (isHealthPath(req.path)) return next();

		const correlationId = req.get('x-correlation-id');
		if (!correlationId) {
			sendError(res, 400, {
				error: 'Missing required header: x-correlation-id',
				code: 'MISSING_HEADER',
				details: { header: 'x-correlation-id' },
			});
			return;
		}

		res.setHeader('x-correlation-id', correlationId);

		if (config.apiKeySecret) {
			const apiKey = req.get('x-api-key');
			if (!apiKey || !safeStringEquals(apiKey, config.apiKeySecret)) {
				sendError(res, 401, {
					error: 'Unauthorized',
					code: 'UNAUTHORIZED',
				});
				return;
			}

			const userId = req.get('x-user-id');
			if (!userId) {
				sendError(res, 400, {
					error: 'Missing required header: x-user-id',
					code: 'MISSING_HEADER',
					details: { header: 'x-user-id' },
				});
				return;
			}
		}

		next();
	};

	const rateLimiter: RequestHandler = (req: Request, res, next) => {
		if (req.method === 'OPTIONS') return next();
		if (isHealthPath(req.path)) return next();

		cleanup();

		const now = Date.now();

		const key = config.apiKeySecret ? (req.get('x-user-id') ?? 'unknown') : (req.ip ?? 'unknown');
		const existing = rateLimits.get(key);

		const entry: RateLimitEntry =
			existing && existing.resetAtMs > now
				? existing
				: {
						count: 0,
						resetAtMs: now + windowMs,
					};

		if (entry.count >= maxRequests) {
			const retryAfterSeconds = Math.max(0, Math.ceil((entry.resetAtMs - now) / 1000));
			res.setHeader('Retry-After', String(retryAfterSeconds));
			sendError(res, 429, {
				error: 'Rate limit exceeded',
				code: 'RATE_LIMITED',
				details: {
					windowMs,
					maxRequests,
					retryAfterSeconds,
				},
			});
			return;
		}

		entry.count += 1;
		rateLimits.set(key, entry);

		res.setHeader('X-RateLimit-Limit', String(maxRequests));
		res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
		res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAtMs / 1000)));

		next();
	};

	return [headerValidator, rateLimiter];
}
