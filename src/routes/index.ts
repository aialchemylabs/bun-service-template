import { Router } from 'express';
import healthRoutes from './health';
import rootRoutes from './root';

const router = Router();

router.use('/api', healthRoutes);
router.use('/', rootRoutes);

export default router;
