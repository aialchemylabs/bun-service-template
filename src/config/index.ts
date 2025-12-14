import dotenv from 'dotenv';
import { z } from 'zod';

export const serviceInfo = {
	name: 'bun-express-service-template',
	version: '0.1.0',
	message: 'Service is running',
} as const;

const ConfigSchema = z.object({
	host: z.string().default('0.0.0.0'),
	port: z.coerce.number().int().min(1).max(65535).default(9000),
	nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
	logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

	apiKeySecret: z.string().min(1).optional(),
	corsOrigins: z.string().default('*'),

	rateLimitWindowMs: z.coerce.number().int().positive().default(300000),
	rateLimitMaxRequests: z.coerce.number().int().positive().default(100),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
	dotenv.config({ quiet: true });

	const rawConfig = {
		host: process.env.HOST,
		port: process.env.PORT,
		nodeEnv: process.env.NODE_ENV,
		logLevel: process.env.LOG_LEVEL,

		apiKeySecret: process.env.API_KEY_SECRET,
		corsOrigins: process.env.CORS_ORIGINS,

		rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
		rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
	};

	return ConfigSchema.parse(rawConfig);
}
