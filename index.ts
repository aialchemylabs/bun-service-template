import type { Server } from 'node:http';
import { createApp } from './src/app';
import { loadConfig, serviceInfo } from './src/config';
import { createLogger } from './src/telemetry/logger';

const shutdownTimeoutMs = 10_000;

function redactConfigSummary(config: ReturnType<typeof loadConfig>) {
	return {
		host: config.host,
		port: config.port,
		nodeEnv: config.nodeEnv,
		logLevel: config.logLevel,
		corsOrigins: config.corsOrigins,
		rateLimitWindowMs: config.rateLimitWindowMs,
		rateLimitMaxRequests: config.rateLimitMaxRequests,
		apiKeyAuthEnabled: Boolean(config.apiKeySecret),
	};
}

async function startServer() {
	let server: Server | undefined;
	let isShuttingDown = false;

	try {
		const config = loadConfig();
		const logger = createLogger({ level: config.logLevel, service: serviceInfo.name, version: serviceInfo.version });

		logger.info('startup', { ...redactConfigSummary(config) });

		const app = createApp(config, logger);

		server = app.listen(config.port, config.host, () => {
			logger.info('listening', {
				url: `http://${config.host}:${config.port}`,
				host: config.host,
				port: config.port,
			});
		});

		server.on('error', (error: NodeJS.ErrnoException) => {
			logger.error('server_error', {
				code: error.code,
				message: error.message,
			});
			process.exit(1);
		});

		const gracefulShutdown = (signal: string) => {
			if (!server || isShuttingDown) return;
			isShuttingDown = true;

			logger.info('shutdown_start', { signal });

			server.close((error) => {
				if (error) {
					logger.error('shutdown_error', { message: error.message });
					process.exit(1);
					return;
				}

				logger.info('shutdown_complete');
				process.exit(0);
			});

			setTimeout(() => {
				logger.error('shutdown_forced', { timeoutMs: shutdownTimeoutMs });
				process.exit(1);
			}, shutdownTimeoutMs).unref();
		};

		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));
	} catch (error) {
		const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
		process.stderr.write(`${message}\n`);
		process.exit(1);
	}
}

startServer();
