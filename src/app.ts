import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Config } from './config';
import type { Logger } from './telemetry/logger';
import { createErrorLogger, createRequestLogger } from './telemetry/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createSecurityMiddleware } from './middleware/security';
import routes from './routes';
import { logRoutes } from './utils/routeLogger';

function parseCorsOrigins(corsOrigins: string): string[] | '*' {
	const trimmed = corsOrigins.trim();
	if (trimmed === '' || trimmed === '*') return '*';

	const parts = trimmed
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	return parts.length > 0 ? parts : '*';
}

export function createApp(config: Config, logger: Logger) {
	const app = express();

	app.set('trust proxy', 1);

	app.use(helmet());
	const corsOrigin = parseCorsOrigins(config.corsOrigins);
	app.use(
		cors({
			origin: corsOrigin,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-correlation-id'],
		}),
	);

	app.use(...createSecurityMiddleware(config));

	app.use(express.json({ limit: '10mb' }));
	app.use(express.urlencoded({ extended: true, limit: '10mb' }));

	app.use(createRequestLogger(logger));

	app.use('/', routes);

	logRoutes(app, logger, 'app');

	app.use(notFoundHandler);
	app.use(createErrorLogger(logger, { nodeEnv: config.nodeEnv }));
	app.use(errorHandler);

	return app;
}
