import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
	res.json({
		status: 'ok',
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
	});
});

router.get('/health/ready', (_req, res) => {
	res.json({
		status: 'ready',
		timestamp: new Date().toISOString(),
	});
});

router.get('/health/live', (_req, res) => {
	res.json({
		status: 'alive',
		timestamp: new Date().toISOString(),
	});
});

export default router;
