import { Router } from 'express';
import { serviceInfo } from '../config';

const router = Router();

router.get('/', (_req, res) => {
	res.json({
		name: serviceInfo.name,
		version: serviceInfo.version,
		message: serviceInfo.message,
		status: 'ok',
		timestamp: new Date().toISOString(),
		endpoints: {
			health: '/api/health',
			ready: '/api/health/ready',
			live: '/api/health/live',
		},
	});
});

export default router;
