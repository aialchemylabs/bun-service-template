import { describe, expect, test } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';
import { loadConfig, serviceInfo } from '../src/config';
import { createLogger } from '../src/telemetry/logger';

describe('service smoke tests', () => {
	test('GET /api/health returns 200', async () => {
		const config = loadConfig();
		const logger = createLogger({ level: 'error', service: serviceInfo.name, version: serviceInfo.version });
		const app = createApp(config, logger);

		const server = app.listen(0);
		try {
			const { port } = server.address() as AddressInfo;
			const res = await fetch(`http://127.0.0.1:${port}/api/health`);
			expect(res.status).toBe(200);

			const body = (await res.json()) as { status: string; uptime: number; timestamp: string };
			expect(body.status).toBeDefined();
			expect(body.uptime).toBeDefined();
			expect(body.timestamp).toBeDefined();
		} finally {
			server.close();
		}
	});

	test('GET / requires x-correlation-id', async () => {
		const config = loadConfig();
		const logger = createLogger({ level: 'error', service: serviceInfo.name, version: serviceInfo.version });
		const app = createApp(config, logger);

		const server = app.listen(0);
		try {
			const { port } = server.address() as AddressInfo;
			const res = await fetch(`http://127.0.0.1:${port}/`);
			expect(res.status).toBe(400);

			const body = (await res.json()) as { success: boolean; code: string };
			expect(body.success).toBe(false);
			expect(body.code).toBe('MISSING_HEADER');
		} finally {
			server.close();
		}
	});
});
