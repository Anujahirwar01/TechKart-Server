import express from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { getBarStats, getDashboardStats, getLineStats, getPieStats } from '../controllers/stats.js';


const router = express.Router();

router.get('/stats',adminOnly, getDashboardStats);

router.get('/pie', adminOnly, getPieStats);

router.get('/bar', adminOnly, getBarStats);

router.get('/line', adminOnly, getLineStats);

export default router;