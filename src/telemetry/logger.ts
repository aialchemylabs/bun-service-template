import type { ErrorRequestHandler, RequestHandler } from 'express';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelWeight: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

type LogMeta = Record<string, unknown>;

export type Logger = {
	level: LogLevel;
	child: (meta: LogMeta) => Logger;
	debug: (message: string, meta?: LogMeta) => void;
	info: (message: string, meta?: LogMeta) => void;
	warn: (message: string, meta?: LogMeta) => void;
	error: (message: string, meta?: LogMeta) => void;
};

function serializeError(error: unknown, includeStack: boolean): unknown {
	if (!(error instanceof Error)) return error;

	return {
		name: error.name,
		message: error.message,
		...(includeStack ? { stack: error.stack } : {}),
	};
}

export function createLogger(options: { level: LogLevel; service: string; version?: string }): Logger {
	const rootMeta: LogMeta = {
		service: options.service,
		...(options.version ? { version: options.version } : {}),
	};

	const log = (level: LogLevel, message: string, meta: LogMeta) => {
		if (levelWeight[level] < levelWeight[options.level]) return;

		const record = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...meta,
		};

		const line = JSON.stringify(record);
		if (level === 'error' || level === 'warn') {
			process.stderr.write(`${line}\n`);
			return;
		}
		process.stdout.write(`${line}\n`);
	};

	const makeLogger = (meta: LogMeta): Logger => ({
		level: options.level,
		child: (childMeta) => makeLogger({ ...meta, ...childMeta }),
		debug: (message, extra) => log('debug', message, { ...meta, ...(extra ?? {}) }),
		info: (message, extra) => log('info', message, { ...meta, ...(extra ?? {}) }),
		warn: (message, extra) => log('warn', message, { ...meta, ...(extra ?? {}) }),
		error: (message, extra) => log('error', message, { ...meta, ...(extra ?? {}) }),
	});

	return makeLogger(rootMeta);
}

export function createRequestLogger(logger: Logger): RequestHandler {
	return (req, res, next) => {
		const start = Date.now();

		res.on('finish', () => {
			const durationMs = Date.now() - start;
			const correlationId = req.get('x-correlation-id');
			const userId = req.get('x-user-id');

			logger.info('http_request', {
				method: req.method,
				path: req.originalUrl,
				status: res.statusCode,
				durationMs,
				correlationId,
				userId,
			});
		});

		next();
	};
}

export function createErrorLogger(logger: Logger, options: { nodeEnv: 'development' | 'production' | 'test' }): ErrorRequestHandler {
	return (error, req, _res, next) => {
		const correlationId = req.get('x-correlation-id');
		const userId = req.get('x-user-id');
		const includeStack = options.nodeEnv !== 'production';

		logger.error('http_error', {
			method: req.method,
			path: req.originalUrl,
			correlationId,
			userId,
			error: serializeError(error, includeStack),
		});

		next(error);
	};
}
